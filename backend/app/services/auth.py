from sqlalchemy.orm import Session
from app.models.user import User
from app.schemas.auth import UserRegisterRequest
from app.core.security import get_password_hash, verify_password, create_access_token, create_refresh_token, verify_token
from app.core.exceptions import EmailAlreadyExistsError, InvalidCredentialsError, InvalidTokenError


class AuthService:
    @staticmethod
    def register(db: Session, user_data: UserRegisterRequest):
        # 이메일 중복 확인
        existing_user = db.query(User).filter(User.email == user_data.email).first()
        if existing_user:
            raise EmailAlreadyExistsError()

        # 새 사용자 생성
        new_user = User(
            email=user_data.email,
            password_hash=get_password_hash(user_data.password),
            full_name=user_data.full_name,
            role="caregiver"
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        return new_user

    @staticmethod
    def login(db: Session, email: str, password: str):
        user = db.query(User).filter(User.email == email).first()
        if not user or not verify_password(password, user.password_hash):
            raise InvalidCredentialsError()

        access_token = create_access_token(user.id, user.email)
        refresh_token = create_refresh_token(user.id, user.email)

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "user": user
        }

    @staticmethod
    def refresh_tokens(db: Session, refresh_token: str):
        payload = verify_token(refresh_token)
        if not payload or payload.get("type") != "refresh":
            raise InvalidTokenError()

        user_id = int(payload.get("sub"))
        email = payload.get("email")

        # 사용자 조회
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise InvalidTokenError()

        new_access_token = create_access_token(user_id, email)
        new_refresh_token = create_refresh_token(user_id, email)

        return {
            "access_token": new_access_token,
            "refresh_token": new_refresh_token,
            "user": user
        }
