from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional


class UserRegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str

    @field_validator('password')
    @classmethod
    def password_strong(cls, v):
        if len(v) < 8:
            raise ValueError('비밀번호는 최소 8자 이상이어야 합니다')
        if not any(c.isupper() for c in v):
            raise ValueError('비밀번호는 최소 1개의 대문자를 포함해야 합니다')
        if not any(c.isdigit() for c in v):
            raise ValueError('비밀번호는 최소 1개의 숫자를 포함해야 합니다')
        return v


class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    fcm_token: Optional[str] = None
    device_type: Optional[str] = None
    push_enabled: bool

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    user: UserResponse


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class FCMTokenUpdateRequest(BaseModel):
    fcm_token: str
    device_type: str  # 'ios', 'android', 'web'
