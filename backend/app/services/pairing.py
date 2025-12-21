from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from typing import Optional, Tuple

from app.core.config import settings
from app.core.security import (
    generate_pairing_code,
    hash_pairing_code,
    create_device_access_token,
)
from app.core.exceptions import (
    NotFoundError,
    PairingCodeError,
    PairingCodeExpiredError,
    PairingCodeUsedError,
    RateLimitExceededError,
)
from app.models.pairing_code import ElderlyPairingCode
from app.models.elderly import Elderly
from app.models.elderly_device import ElderlyDevice
from app.services.rate_limiter import rate_limiter


class PairingService:
    """Service for managing elderly device pairing codes."""

    @staticmethod
    def create_pairing_code(
        db: Session,
        elderly_id: int,
        caregiver_id: int
    ) -> Tuple[str, datetime]:
        """
        Generate a new 6-digit pairing code for an elderly.

        Args:
            db: Database session
            elderly_id: ID of the elderly to pair
            caregiver_id: ID of the caregiver creating the code

        Returns:
            Tuple of (plaintext code, expiration datetime)

        Raises:
            NotFoundError: If elderly not found or doesn't belong to caregiver
        """
        # Verify elderly exists and belongs to caregiver
        elderly = db.query(Elderly).filter(
            Elderly.id == elderly_id,
            Elderly.caregiver_id == caregiver_id
        ).first()

        if not elderly:
            raise NotFoundError("어르신")

        # Invalidate any existing unused codes for this elderly
        db.query(ElderlyPairingCode).filter(
            ElderlyPairingCode.elderly_id == elderly_id,
            ElderlyPairingCode.used_at.is_(None)
        ).delete()

        # Generate new code
        code = generate_pairing_code()
        code_hash = hash_pairing_code(code, settings.PAIRING_CODE_PEPPER)
        expires_at = datetime.utcnow() + timedelta(minutes=settings.PAIRING_CODE_TTL_MINUTES)

        pairing_code = ElderlyPairingCode(
            elderly_id=elderly_id,
            code_hash=code_hash,
            expires_at=expires_at,
            created_by_user_id=caregiver_id,
        )

        db.add(pairing_code)
        db.commit()

        return code, expires_at

    @staticmethod
    def claim_pairing_code(
        db: Session,
        code: str,
        fcm_token: str,
        platform: str,
        device_name: Optional[str],
        os_version: Optional[str],
        client_ip: str,
    ) -> dict:
        """
        Claim a pairing code and register the device.

        Args:
            db: Database session
            code: 6-digit pairing code
            fcm_token: Firebase Cloud Messaging token
            platform: Device platform (ios/android)
            device_name: Optional device name
            os_version: Optional OS version
            client_ip: Client IP for rate limiting

        Returns:
            Dict with elderly_id, device_id, device_access_token, expires_in

        Raises:
            RateLimitExceededError: If rate limit exceeded
            PairingCodeError: If code is invalid
            PairingCodeExpiredError: If code has expired
            PairingCodeUsedError: If code was already used
        """
        # Rate limit by IP
        if not rate_limiter.check_ip_rate_limit(client_ip):
            raise RateLimitExceededError()

        # Hash the code
        code_hash = hash_pairing_code(code, settings.PAIRING_CODE_PEPPER)

        # Rate limit by code hash
        if not rate_limiter.check_code_rate_limit(code_hash):
            raise RateLimitExceededError()

        # Find the pairing code
        pairing_code = db.query(ElderlyPairingCode).filter(
            ElderlyPairingCode.code_hash == code_hash
        ).first()

        if not pairing_code:
            remaining = rate_limiter.get_remaining_attempts(code_hash)
            raise PairingCodeError("잘못된 페어링 코드입니다", remaining)

        # Check if expired
        if datetime.utcnow() > pairing_code.expires_at:
            raise PairingCodeExpiredError()

        # Check if already used
        if pairing_code.used_at is not None:
            raise PairingCodeUsedError()

        # Increment attempt count
        pairing_code.attempt_count += 1

        # Check max attempts
        if pairing_code.attempt_count > settings.PAIRING_CODE_MAX_ATTEMPTS:
            db.commit()
            raise PairingCodeError("최대 시도 횟수를 초과했습니다", 0)

        # Mark as used
        pairing_code.used_at = datetime.utcnow()

        # Deactivate all existing devices for this elderly (enforce single device)
        db.query(ElderlyDevice).filter(
            ElderlyDevice.elderly_id == pairing_code.elderly_id,
            ElderlyDevice.is_active == True
        ).update({"is_active": False})

        # Check if device already exists (by fcm_token)
        existing_device = db.query(ElderlyDevice).filter(
            ElderlyDevice.fcm_token == fcm_token
        ).first()

        if existing_device:
            # Update existing device
            existing_device.elderly_id = pairing_code.elderly_id
            existing_device.platform = platform
            existing_device.device_name = device_name or existing_device.device_name
            existing_device.is_active = True
            existing_device.last_used_at = datetime.utcnow()
            device = existing_device
        else:
            # Create new device
            device = ElderlyDevice(
                elderly_id=pairing_code.elderly_id,
                fcm_token=fcm_token,
                platform=platform,
                device_name=device_name,
                is_active=True,
                last_used_at=datetime.utcnow(),
            )
            db.add(device)

        db.commit()
        db.refresh(device)

        # Create device access token
        device_token = create_device_access_token(
            elderly_id=pairing_code.elderly_id,
            device_id=device.id,
        )

        return {
            "elderly_id": pairing_code.elderly_id,
            "device_id": device.id,
            "device_access_token": device_token,
            "expires_in": settings.DEVICE_TOKEN_EXPIRE_DAYS * 24 * 3600,  # seconds
        }

    @staticmethod
    def get_pairing_status(
        db: Session,
        elderly_id: int,
        caregiver_id: int,
    ) -> dict:
        """
        Get pairing status for an elderly.

        Args:
            db: Database session
            elderly_id: ID of the elderly
            caregiver_id: ID of the caregiver

        Returns:
            Dict with pairing status info

        Raises:
            NotFoundError: If elderly not found or doesn't belong to caregiver
        """
        # Verify elderly exists and belongs to caregiver
        elderly = db.query(Elderly).filter(
            Elderly.id == elderly_id,
            Elderly.caregiver_id == caregiver_id
        ).first()

        if not elderly:
            raise NotFoundError("어르신")

        # Get active devices
        devices = db.query(ElderlyDevice).filter(
            ElderlyDevice.elderly_id == elderly_id,
            ElderlyDevice.is_active == True
        ).all()

        # Get latest unused pairing code
        active_code = db.query(ElderlyPairingCode).filter(
            ElderlyPairingCode.elderly_id == elderly_id,
            ElderlyPairingCode.used_at.is_(None),
            ElderlyPairingCode.expires_at > datetime.utcnow()
        ).first()

        return {
            "elderly_id": elderly_id,
            "has_active_code": active_code is not None,
            "code_expires_at": active_code.expires_at.isoformat() if active_code else None,
            "paired_devices": [
                {
                    "id": d.id,
                    "platform": d.platform,
                    "device_name": d.device_name,
                    "last_used_at": d.last_used_at.isoformat() if d.last_used_at else None,
                }
                for d in devices
            ],
            "device_count": len(devices),
        }

    @staticmethod
    def disconnect_device(
        db: Session,
        elderly_id: int,
        device_id: int,
        caregiver_id: int,
    ) -> None:
        """
        Disconnect/unpair a device from an elderly.

        Args:
            db: Database session
            elderly_id: ID of the elderly
            device_id: ID of the device to disconnect
            caregiver_id: ID of the caregiver

        Raises:
            NotFoundError: If elderly or device not found
        """
        # Verify elderly exists and belongs to caregiver
        elderly = db.query(Elderly).filter(
            Elderly.id == elderly_id,
            Elderly.caregiver_id == caregiver_id
        ).first()

        if not elderly:
            raise NotFoundError("어르신")

        # Find and deactivate the device
        device = db.query(ElderlyDevice).filter(
            ElderlyDevice.id == device_id,
            ElderlyDevice.elderly_id == elderly_id,
            ElderlyDevice.is_active == True
        ).first()

        if not device:
            raise NotFoundError("기기")

        device.is_active = False
        db.commit()
