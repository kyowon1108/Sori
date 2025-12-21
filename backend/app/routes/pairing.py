from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.pairing import (
    PairingCodeCreateResponse,
    PairingStatusResponse,
)
from app.schemas.response import success_response
from app.services.pairing import PairingService

router = APIRouter()


@router.post("/{elderly_id}/pairing-code")
async def create_pairing_code(
    elderly_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Generate a 6-digit pairing code for an elderly (caregiver only).

    The code expires in 10 minutes and can only be used once.
    Generating a new code invalidates any previous unused codes.
    """
    code, expires_at = PairingService.create_pairing_code(
        db, elderly_id, current_user.id
    )
    return success_response(
        data=PairingCodeCreateResponse(code=code, expires_at=expires_at).model_dump(mode="json"),
        message="페어링 코드가 생성되었습니다",
        code=200,
    )


@router.get("/{elderly_id}/pairing-status")
async def get_pairing_status(
    elderly_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get pairing status for an elderly (caregiver only).

    Returns information about active pairing codes and paired devices.
    """
    status = PairingService.get_pairing_status(db, elderly_id, current_user.id)
    return success_response(
        data=PairingStatusResponse(**status).model_dump(mode="json"),
        message="OK",
        code=200,
    )


@router.delete("/{elderly_id}/devices/{device_id}")
async def disconnect_device(
    elderly_id: int,
    device_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Disconnect/unpair a device from an elderly (caregiver only).
    """
    PairingService.disconnect_device(db, elderly_id, device_id, current_user.id)
    return success_response(
        data=None,
        message="기기 연결이 해제되었습니다",
        code=200,
    )
