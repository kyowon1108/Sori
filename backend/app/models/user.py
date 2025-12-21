from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), default="caregiver")

    # 모바일 푸시 알림
    fcm_token = Column(String(512), nullable=True)
    device_type = Column(String(20), nullable=True)  # 'ios', 'android', 'web'
    push_enabled = Column(Boolean, default=True)
    fcm_token_updated_at = Column(DateTime, nullable=True)

    # 메타데이터
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # 관계
    elderly = relationship("Elderly", back_populates="caregiver", cascade="all, delete-orphan")
