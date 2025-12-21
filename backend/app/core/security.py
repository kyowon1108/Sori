from datetime import datetime, timedelta
from hashlib import sha256
from jose import JWTError, jwt
from passlib.context import CryptContext
from typing import Optional, Literal
import secrets

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(
    user_id: int,
    email: str,
    scope: Literal["caregiver"] = "caregiver"
) -> str:
    to_encode = {
        "sub": str(user_id),
        "email": email,
        "type": "access",
        "scope": scope,
    }
    expire = datetime.utcnow() + timedelta(hours=settings.ACCESS_TOKEN_EXPIRE_HOURS)
    to_encode.update({"exp": expire})

    encoded_jwt = jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM
    )
    return encoded_jwt


def create_refresh_token(user_id: int, email: str) -> str:
    to_encode = {
        "sub": str(user_id),
        "email": email,
        "type": "refresh",
    }
    expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire})

    encoded_jwt = jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM
    )
    return encoded_jwt


def verify_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        return None


# Pairing code functions
def generate_pairing_code() -> str:
    """Generate a random 6-digit numeric code."""
    return f"{secrets.randbelow(1000000):06d}"


def hash_pairing_code(code: str, pepper: str) -> str:
    """Hash a 6-digit pairing code with pepper using SHA256."""
    return sha256(f"{code}{pepper}".encode()).hexdigest()


def create_device_access_token(
    elderly_id: int,
    device_id: int,
    scope: Literal["elderly"] = "elderly"
) -> str:
    """Create a long-lived device access token for elderly devices."""
    to_encode = {
        "sub": str(elderly_id),
        "device_id": device_id,
        "scope": scope,
        "type": "device_access",
    }
    expire = datetime.utcnow() + timedelta(days=settings.DEVICE_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire})

    encoded_jwt = jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM
    )
    return encoded_jwt
