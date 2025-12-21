from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.schemas.auth import (
    UserRegisterRequest, UserLoginRequest, UserResponse,
    TokenResponse, RefreshTokenRequest, FCMTokenUpdateRequest
)
from app.schemas.response import success_response
from app.services.auth import AuthService
from app.models.user import User

router = APIRouter()


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(user_data: UserRegisterRequest, db: Session = Depends(get_db)):
    """새 사용자 회원가입"""
    user = AuthService.register(db, user_data)
    return success_response(
        data=UserResponse.model_validate(user).model_dump(),
        message="User registered",
        code=201
    )


@router.post("/login")
async def login(credentials: UserLoginRequest, db: Session = Depends(get_db)):
    """사용자 로그인"""
    result = AuthService.login(db, credentials.email, credentials.password)
    return success_response(
        data={
            "access_token": result["access_token"],
            "refresh_token": result["refresh_token"],
            "user": UserResponse.model_validate(result["user"]).model_dump()
        },
        message="Login successful",
        code=200
    )


@router.post("/refresh")
async def refresh(request: RefreshTokenRequest, db: Session = Depends(get_db)):
    """토큰 갱신"""
    result = AuthService.refresh_tokens(db, request.refresh_token)
    return success_response(
        data={
            "access_token": result["access_token"],
            "refresh_token": result["refresh_token"],
            "user": UserResponse.model_validate(result["user"]).model_dump()
        },
        message="Token refreshed",
        code=200
    )


@router.get("/me")
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """현재 사용자 정보 조회"""
    return success_response(
        data=UserResponse.model_validate(current_user).model_dump(),
        message="OK",
        code=200
    )


@router.post("/update-fcm-token")
async def update_fcm_token(
    request: FCMTokenUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """FCM 토큰 업데이트"""
    from datetime import datetime
    current_user.fcm_token = request.fcm_token
    current_user.device_type = request.device_type
    current_user.fcm_token_updated_at = datetime.utcnow()
    db.add(current_user)
    db.commit()
    return success_response(message="FCM 토큰이 업데이트되었습니다", code=200)
