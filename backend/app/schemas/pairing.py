from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import datetime


class PairingCodeCreateResponse(BaseModel):
    """Response when a new pairing code is generated."""
    code: str = Field(..., description="6-digit pairing code")
    expires_at: datetime


class PairingCodeClaimRequest(BaseModel):
    """Request to claim a pairing code."""
    code: str = Field(..., min_length=6, max_length=6)
    fcm_token: str = Field(..., min_length=1)
    platform: str = Field(default="ios")
    device_name: Optional[str] = None
    os_version: Optional[str] = None

    @field_validator('code')
    @classmethod
    def code_must_be_numeric(cls, v):
        if not v.isdigit():
            raise ValueError('페어링 코드는 숫자만 포함해야 합니다')
        return v

    @field_validator('platform')
    @classmethod
    def platform_must_be_valid(cls, v):
        if v not in ('ios', 'android'):
            raise ValueError('플랫폼은 ios 또는 android이어야 합니다')
        return v


class PairingCodeClaimResponse(BaseModel):
    """Response when a pairing code is successfully claimed."""
    elderly_id: int
    device_id: int
    device_access_token: str
    expires_in: int = Field(..., description="Token validity in seconds")


class DeviceInfo(BaseModel):
    """Information about a paired device."""
    id: int
    platform: str
    device_name: Optional[str]
    last_used_at: Optional[str]


class PairingStatusResponse(BaseModel):
    """Response with pairing status information."""
    elderly_id: int
    has_active_code: bool
    code_expires_at: Optional[str]
    paired_devices: List[DeviceInfo]
    device_count: int
