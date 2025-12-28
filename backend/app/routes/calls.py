from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.call import CallCreateRequest, CallStartResponse, CallDetailResponse, CallListResponse, CallAnalysisResponse
from app.schemas.response import success_response
from app.services.calls import CallService
from app.services.ai_service import AIService
from app.core.config import settings
from app.core.exceptions import NotFoundError, ForbiddenError

router = APIRouter()
ai_service = AIService()


@router.get("")
async def list_calls(
    elderly_id: int = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """통화 목록 조회"""
    calls = CallService.get_list(db, current_user.id, elderly_id, skip, limit)
    total = len(calls)
    return success_response(
        data={
            "items": [CallListResponse.model_validate(c).model_dump() for c in calls],
            "total": total
        },
        message="OK",
        code=200
    )


@router.get("/{call_id}")
async def get_call(
    call_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """통화 상세 조회 (메시지 + 분석) - 완료된 통화만"""
    call = CallService.get_by_id(db, call_id, current_user.id)

    # 진행 중이거나 예정된 통화는 상세 조회 불가
    if call.status in ("in_progress", "scheduled"):
        raise ForbiddenError("진행 중인 통화의 상세 정보는 조회할 수 없습니다")

    return success_response(
        data=CallDetailResponse.model_validate(call).model_dump(),
        message="OK",
        code=200
    )


@router.post("", status_code=status.HTTP_201_CREATED)
async def start_call(
    call_data: CallCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """새 통화 시작"""
    call = CallService.start_call(db, call_data, current_user.id)

    # WebSocket URL 생성
    ws_host = settings.API_HOST if settings.API_HOST != "0.0.0.0" else "localhost"
    ws_url = f"ws://{ws_host}:{settings.API_PORT}/ws/{call.id}"

    return success_response(
        data={
            "id": call.id,
            "elderly_id": call.elderly_id,
            "call_type": call.call_type,
            "started_at": call.started_at.isoformat(),
            "status": call.status,
            "ws_url": ws_url
        },
        message="Call started",
        code=201
    )


@router.put("/{call_id}/end")
async def end_call(
    call_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """통화 종료 + 분석"""
    call = CallService.end_call(db, call_id, current_user.id)

    # 메시지가 있으면 Claude API로 분석 실행
    if call.messages:
        messages_list = [
            {"role": m.role, "content": m.content}
            for m in call.messages
        ]
        try:
            analysis_result = ai_service.analyze_call(messages_list)
            CallService.save_analysis(db, call_id, analysis_result)
        except Exception:
            # 분석 실패해도 통화 종료는 성공
            pass

    return success_response(
        data={
            "id": call.id,
            "status": call.status,
            "duration": call.duration,
            "ended_at": call.ended_at.isoformat() if call.ended_at else None
        },
        message="통화가 종료되었습니다",
        code=200
    )


@router.get("/{call_id}/analysis")
async def get_call_analysis(
    call_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """통화 분석 결과 조회"""
    call = CallService.get_by_id(db, call_id, current_user.id)

    if not call.analysis:
        raise NotFoundError("분석 결과")

    return success_response(
        data=CallAnalysisResponse.model_validate(call.analysis).model_dump(),
        message="OK",
        code=200
    )
