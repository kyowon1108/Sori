from fastapi import Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.security import verify_token
from app.models.user import User
from app.core.exceptions import InvalidTokenError

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """현재 사용자 조회 (토큰 검증)"""
    token = credentials.credentials

    payload = verify_token(token)
    if not payload or payload.get("type") == "refresh":
        raise InvalidTokenError()

    user_id = int(payload.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise InvalidTokenError()

    return user
