from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime

from app.database import Base


class Call(Base):
    __tablename__ = "calls"

    id = Column(Integer, primary_key=True, index=True)
    elderly_id = Column(Integer, ForeignKey("elderly.id", ondelete="CASCADE"), nullable=False, index=True)

    # 통화 정보
    call_type = Column(String(50), default="voice")
    started_at = Column(DateTime, nullable=False)
    ended_at = Column(DateTime, nullable=True)
    duration = Column(Integer, nullable=True)  # seconds

    # 상태
    status = Column(String(50), default="in_progress")  # 'in_progress', 'completed', 'failed', 'cancelled'
    is_successful = Column(Boolean, default=True)

    # 메타데이터
    created_at = Column(DateTime, default=datetime.utcnow)

    # 관계
    elderly = relationship("Elderly", back_populates="calls")
    messages = relationship("Message", back_populates="call", cascade="all, delete-orphan")
    analysis = relationship("CallAnalysis", back_populates="call", uselist=False, cascade="all, delete-orphan")
