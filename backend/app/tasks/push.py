"""
Push notification Celery tasks.
"""
import logging
from typing import Optional

from app.celery_app import celery_app
from app.tasks.base import get_task_db
from app.models.elderly import Elderly
from app.models.elderly_device import ElderlyDevice
from app.models.user import User
from app.services.fcm import fcm_service

logger = logging.getLogger(__name__)


@celery_app.task(name="app.tasks.push.send_scheduled_push")
def send_scheduled_push(elderly_id: int, call_id: int):
    """
    Send push notification to elderly's devices for scheduled call.
    """
    with get_task_db() as db:
        elderly = db.query(Elderly).filter(Elderly.id == elderly_id).first()
        if not elderly:
            logger.error(f"Elderly {elderly_id} not found")
            return {"status": "error", "message": "Elderly not found"}

        # Get active devices for this elderly
        devices = db.query(ElderlyDevice).filter(
            ElderlyDevice.elderly_id == elderly_id,
            ElderlyDevice.is_active == True,
        ).all()

        if not devices:
            logger.warning(f"No active devices for elderly {elderly_id}")
            return {"status": "no_devices"}

        tokens = [d.fcm_token for d in devices]

        # Send notification with deep link data
        result = fcm_service.send_to_tokens(
            tokens=tokens,
            title="소리가 전화드려요",
            body=f"{elderly.name}님, 오늘 기분은 어떠세요?",
            data={
                "type": "scheduled_call",
                "call_id": str(call_id),
                "elderly_id": str(elderly_id),
                "deep_link": f"sori://call/{call_id}",
            },
        )

        logger.info(f"Push sent for elderly {elderly_id}: {result}")
        return result


@celery_app.task(name="app.tasks.push.send_missed_notification")
def send_missed_notification(elderly_id: int, call_id: int):
    """
    Send notification to caregiver about missed call.
    """
    with get_task_db() as db:
        elderly = db.query(Elderly).filter(Elderly.id == elderly_id).first()
        if not elderly:
            logger.error(f"Elderly {elderly_id} not found")
            return {"status": "error", "message": "Elderly not found"}

        caregiver = db.query(User).filter(User.id == elderly.caregiver_id).first()
        if not caregiver or not caregiver.fcm_token:
            logger.warning(f"Caregiver {elderly.caregiver_id} has no FCM token")
            return {"status": "no_token"}

        result = fcm_service.send_to_token(
            token=caregiver.fcm_token,
            title="부재중 알림",
            body=f"{elderly.name}님이 예약된 통화에 응답하지 않았습니다.",
            data={
                "type": "missed_call",
                "call_id": str(call_id),
                "elderly_id": str(elderly_id),
            },
        )

        logger.info(f"Missed notification sent to caregiver: {result}")
        return {"status": "sent", "message_id": result}


@celery_app.task(name="app.tasks.push.send_high_risk_alert")
def send_high_risk_alert(elderly_id: int, call_id: int, risk_score: int, concerns: str):
    """
    Send urgent notification to caregiver about high-risk assessment.
    """
    with get_task_db() as db:
        elderly = db.query(Elderly).filter(Elderly.id == elderly_id).first()
        if not elderly:
            logger.error(f"Elderly {elderly_id} not found")
            return {"status": "error", "message": "Elderly not found"}

        caregiver = db.query(User).filter(User.id == elderly.caregiver_id).first()
        if not caregiver or not caregiver.fcm_token:
            logger.warning(f"Caregiver {elderly.caregiver_id} has no FCM token")
            return {"status": "no_token"}

        # Truncate concerns for notification body
        concerns_preview = concerns[:100] + "..." if len(concerns) > 100 else concerns

        result = fcm_service.send_to_token(
            token=caregiver.fcm_token,
            title=f"[긴급] {elderly.name}님 주의 필요",
            body=f"위험 점수: {risk_score}/100. {concerns_preview}",
            data={
                "type": "high_risk_alert",
                "call_id": str(call_id),
                "elderly_id": str(elderly_id),
                "risk_score": str(risk_score),
                "priority": "high",
            },
        )

        logger.warning(f"High risk alert sent for elderly {elderly_id}: score={risk_score}")
        return {"status": "sent", "message_id": result}


@celery_app.task(name="app.tasks.push.send_generic_push")
def send_generic_push(
    token: str,
    title: str,
    body: str,
    data: Optional[dict] = None,
):
    """
    Send a generic push notification to a specific token.
    Useful for testing or one-off notifications.
    """
    # Convert all data values to strings (FCM requirement)
    string_data = {}
    if data:
        string_data = {k: str(v) for k, v in data.items()}

    result = fcm_service.send_to_token(
        token=token,
        title=title,
        body=body,
        data=string_data,
    )

    return {"status": "sent" if result else "failed", "message_id": result}
