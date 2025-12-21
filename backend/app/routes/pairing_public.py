from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.pairing import (
    PairingCodeClaimRequest,
    PairingCodeClaimResponse,
)
from app.schemas.response import success_response
from app.services.pairing import PairingService

router = APIRouter()


@router.post("/claim")
async def claim_pairing_code(
    request: Request,
    claim_data: PairingCodeClaimRequest,
    db: Session = Depends(get_db),
):
    """
    Claim a pairing code (no auth required - public endpoint).

    This endpoint is rate-limited to prevent brute-force attacks:
    - 10 attempts per 5 minutes per IP address
    - 5 attempts total per pairing code

    On success, returns a device access token that can be used
    to authenticate WebSocket connections.
    """
    # Get client IP for rate limiting
    client_ip = request.client.host
    # Handle X-Forwarded-For if behind proxy
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        client_ip = forwarded_for.split(",")[0].strip()

    result = PairingService.claim_pairing_code(
        db=db,
        code=claim_data.code,
        fcm_token=claim_data.fcm_token,
        platform=claim_data.platform,
        device_name=claim_data.device_name,
        os_version=claim_data.os_version,
        client_ip=client_ip,
    )

    return success_response(
        data=PairingCodeClaimResponse(**result).model_dump(),
        message="기기가 성공적으로 연결되었습니다",
        code=200,
    )
