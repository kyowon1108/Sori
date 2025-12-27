"""
Device-specific routes for elderly iOS app.
These routes use device_access_token authentication (scope=elderly).
"""
from datetime import datetime, timedelta
from typing import Optional
import sys

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from sqlalchemy import or_, and_
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.security import verify_token
from app.core.logging import get_logger
from app.models.call import Call
from app.models.elderly_device import ElderlyDevice

router = APIRouter()
security = HTTPBearer()
logger = get_logger(__name__)


# MARK: - Response Models

class PendingCallResponse(BaseModel):
    call_id: int
    status: str
    scheduled_at: Optional[str] = None


# MARK: - Device Token Dependency

def get_elderly_from_device_token(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> int:
    """
    Validate device_access_token and return elderly_id.
    Raises 401 if token is invalid or not a device token.
    """
    token = credentials.credentials
    payload = verify_token(token)

    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    # Verify this is an elderly device token
    if payload.get("scope") != "elderly" or payload.get("type") != "device_access":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid token scope",
        )

    elderly_id = int(payload.get("sub", 0))
    device_id = payload.get("device_id")

    if not elderly_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )

    # Optionally verify device is still active
    if device_id:
        device = db.query(ElderlyDevice).filter(
            ElderlyDevice.id == device_id,
            ElderlyDevice.is_active == True,
        ).first()
        if not device:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Device not active",
            )

    return elderly_id


# MARK: - Endpoints

@router.get("/pending-call")
async def get_pending_call(
    elderly_id: int = Depends(get_elderly_from_device_token),
    db: Session = Depends(get_db),
):
    """
    Get the next pending call for this elderly.

    Returns either:
    1. Manual call in progress (caregiver-initiated)
    2. Scheduled auto call within the time window

    Used by iOS app to poll for calls without FCM push.
    """
    now = datetime.utcnow()

    # Look for calls scheduled in the past 5 minutes to next 60 minutes
    time_window_start = now - timedelta(minutes=5)
    time_window_end = now + timedelta(minutes=60)

    # Query for pending calls:
    # - Any in_progress calls (caregiver-initiated or voice)
    # - OR Auto scheduled calls within time window
    pending_call = db.query(Call).filter(
        Call.elderly_id == elderly_id,
        or_(
            # Any in-progress calls (caregiver-initiated, voice, manual)
            Call.status == "in_progress",
            # Auto scheduled calls within time window
            and_(
                Call.trigger_type == "auto",
                Call.status == "scheduled",
                Call.scheduled_for >= time_window_start,
                Call.scheduled_for <= time_window_end
            )
        )
    ).order_by(
        # Prioritize in_progress calls, then by scheduled time
        Call.status.desc(),
        Call.scheduled_for.asc()
    ).first()

    # DEBUG: Log query result
    print(f"[DEBUG] ===== [PENDING-CALL] elderly_id={elderly_id} =====", flush=True)
    sys.stdout.flush()
    print(f"[DEBUG] Query result: found={pending_call is not None}", flush=True)
    sys.stdout.flush()
    if pending_call:
        print(f"[DEBUG]   ✓ Call ID: {pending_call.id}", flush=True)
        print(f"[DEBUG]   ✓ Status: {pending_call.status}", flush=True)
        print(f"[DEBUG]   ✓ Call Type: {pending_call.call_type}", flush=True)
        print(f"[DEBUG]   ✓ Trigger Type: {pending_call.trigger_type}", flush=True)
        sys.stdout.flush()
    else:
        # Show all calls for debugging
        all_calls = db.query(Call).filter(Call.elderly_id == elderly_id).all()
        print(f"[DEBUG]   ✗ No pending call found", flush=True)
        print(f"[DEBUG]   Total calls for elderly_id={elderly_id}: {len(all_calls)}", flush=True)
        for c in all_calls[:5]:
            print(f"[DEBUG]     - Call {c.id}: status={c.status}, type={c.call_type}/{c.trigger_type}", flush=True)
        sys.stdout.flush()
    print(f"[DEBUG] {'=' * 60}", flush=True)
    sys.stdout.flush()

    if not pending_call:
        # Return success with null data (no pending call)
        return {
            "status": "success",
            "code": 200,
            "message": "No pending call",
            "data": None,
        }

    return {
        "status": "success",
        "code": 200,
        "message": "Pending call found",
        "data": PendingCallResponse(
            call_id=pending_call.id,
            status=pending_call.status,
            scheduled_at=pending_call.scheduled_for.isoformat() if pending_call.scheduled_for else None,
        ).model_dump(),
    }


@router.post("/heartbeat")
async def device_heartbeat(
    elderly_id: int = Depends(get_elderly_from_device_token),
    db: Session = Depends(get_db),
):
    """
    Device heartbeat endpoint.
    Updates last_used_at for the device.
    Can be used for connection status monitoring.
    """
    # This would update device.last_used_at
    # For now, just acknowledge the heartbeat
    return {
        "status": "success",
        "code": 200,
        "message": "Heartbeat received",
        "data": {
            "server_time": datetime.utcnow().isoformat(),
        },
    }
