"""스케줄 기반 Call 생성 및 missed 처리 태스크.

DB 시간 저장 규칙(중요):
- calls.scheduled_for / started_at / ended_at 등은 UTC naive(datetime.utcnow())로 저장/비교
- call_schedule의 "HH:MM" 매칭만 KST로 계산
"""
import logging
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from app.celery_app import celery_app
from app.tasks.base import get_task_db
from app.models.elderly import Elderly
from app.models.call import Call

logger = logging.getLogger(__name__)
KST = ZoneInfo("Asia/Seoul")
UTC = timezone.utc


@celery_app.task(name="app.tasks.schedule.check_schedules")
def check_schedules():
    """매분 실행: 현재 시각(HH:MM)에 해당하는 스케줄 확인 및 Call 생성."""
    now_kst = datetime.now(KST)
    current_time = now_kst.strftime("%H:%M")
    current_weekday = now_kst.strftime("%A").lower()

    logger.info(f"Checking schedules for {current_time} ({current_weekday})")

    created_count = 0

    with get_task_db() as db:
        # Get all elderly with enabled schedules
        elderly_list = db.query(Elderly).filter(
            Elderly.call_schedule.isnot(None)
        ).all()

        for elderly in elderly_list:
            schedule = elderly.call_schedule or {}

            # Check if schedule is enabled
            if not schedule.get("enabled", False):
                continue

            # Check if current time matches any scheduled time
            times = schedule.get("times", [])
            if current_time not in times:
                continue

            # Check day restrictions if present
            days = schedule.get("days")
            if days and current_weekday not in [d.lower() for d in days]:
                continue

            # scheduled_for는 DB에 UTC naive로 저장(분 단위 정규화)
            scheduled_time_utc = (
                now_kst.replace(second=0, microsecond=0)
                .astimezone(UTC)
                .replace(tzinfo=None)
            )

            try:
                # 새 Call 생성 (UNIQUE 제약으로 중복 시 예외)
                new_call = Call(
                    elderly_id=elderly.id,
                    call_type="voice",
                    status="scheduled",
                    trigger_type="auto",
                    scheduled_for=scheduled_time_utc,
                    started_at=scheduled_time_utc,  # WS 연결 시 갱신됨
                )
                db.add(new_call)
                db.commit()
                db.refresh(new_call)

                logger.info(f"Created scheduled call {new_call.id} for elderly {elderly.id}")
                created_count += 1

                # Queue push notification task
                from app.tasks.push import send_scheduled_push
                send_scheduled_push.delay(elderly.id, new_call.id)

                # 5분 후 missed 체크 예약
                check_missed_single.apply_async(
                    args=[new_call.id],
                    countdown=300  # 5분
                )

            except Exception as e:
                db.rollback()
                emsg = str(e).lower()
                # DB 부분 유니크 인덱스/제약 위반 케이스(중복 생성)면 조용히 스킵
                if ("idx_calls_elderly_scheduled" in emsg) or ("unique" in emsg) or ("duplicate key" in emsg):
                    logger.debug(f"Call already exists for elderly {elderly.id} at {current_time}")
                else:
                    logger.error(f"Error creating call for elderly {elderly.id}: {e}")

    return {"created": created_count, "time": current_time}


@celery_app.task(name="app.tasks.schedule.check_missed_single")
def check_missed_single(call_id: int):
    """5분 후 실행: 특정 Call이 여전히 scheduled 상태면 missed 처리."""
    with get_task_db() as db:
        # P0: 레이스 컨디션 방지
        # WS 접속이 거의 동시에 일어나 scheduled->in_progress로 바뀌는 경우가 있으므로,
        # "status == scheduled" 조건부 UPDATE로 원자적으로 missed 처리
        updated = db.query(Call).filter(
            Call.id == call_id,
            Call.status == "scheduled",
        ).update(
            {
                "status": "missed",
                "is_successful": False,
                "ended_at": datetime.utcnow(),
            },
            synchronize_session=False,
        )
        db.commit()

        if updated == 0:
            return {"status": "already_handled_or_not_found"}

        # elderly_id는 업데이트 후 조회(알림용)
        call = db.query(Call).filter(Call.id == call_id).first()
        elderly_id = call.elderly_id if call else None
        logger.info(f"Call {call_id} marked as missed (atomic)")

        if elderly_id:
            from app.tasks.push import send_missed_notification
            send_missed_notification.delay(elderly_id, call_id)

        return {"status": "marked_missed"}


@celery_app.task(name="app.tasks.schedule.sweep_missed_calls")
def sweep_missed_calls():
    """매 5분 실행: 누락된 missed 처리 보정 (워커 장애 대응)."""
    now_utc = datetime.utcnow()
    threshold = now_utc - timedelta(minutes=5)

    with get_task_db() as db:
        # 먼저 대상 call 목록을 확보(알림에 필요)
        stale_calls = db.query(Call).filter(
            Call.status == "scheduled",
            Call.trigger_type == "auto",
            Call.scheduled_for < threshold,
        ).all()

        if not stale_calls:
            return {"swept": 0}

        stale_ids = [c.id for c in stale_calls]
        stale_pairs = [(c.id, c.elderly_id) for c in stale_calls]

        # 원자적 bulk update
        updated = db.query(Call).filter(
            Call.id.in_(stale_ids),
            Call.status == "scheduled",
        ).update(
            {
                "status": "missed",
                "is_successful": False,
                "ended_at": now_utc,
            },
            synchronize_session=False,
        )
        db.commit()

        if updated > 0:
            from app.tasks.push import send_missed_notification
            for call_id, elderly_id in stale_pairs:
                send_missed_notification.delay(elderly_id, call_id)
            logger.warning(f"Sweep: {updated} stale calls marked as missed (atomic)")

        return {"swept": updated}
