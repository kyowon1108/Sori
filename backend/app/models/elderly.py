from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime

from app.database import Base


class Elderly(Base):
    __tablename__ = "elderly"

    id = Column(Integer, primary_key=True, index=True)
    caregiver_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # 기본 정보
    name = Column(String(255), nullable=False)
    age = Column(Integer, nullable=True)
    phone = Column(String(20), nullable=True)

    # 통화 관련
    call_schedule = Column(JSON, default={"enabled": True, "times": ["09:00", "14:00", "19:00"]})

    # 건강 정보
    health_condition = Column(Text, nullable=True)
    medications = Column(JSON, nullable=True)
    emergency_contact = Column(String(255), nullable=True)

    # 상태 정보
    risk_level = Column(String(20), default="low")  # 'low', 'medium', 'high', 'critical'
    notes = Column(Text, nullable=True)

    # 메타데이터
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # 관계
    caregiver = relationship("User", back_populates="elderly")
    calls = relationship("Call", back_populates="elderly", cascade="all, delete-orphan")
    devices = relationship("ElderlyDevice", back_populates="elderly", cascade="all, delete-orphan")
