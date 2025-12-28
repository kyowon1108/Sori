from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

from app.database import Base


class Call(Base):
    __tablename__ = "calls"
    # NOTE:
    # scheduled call 중복 방지는 DB의 부분 유니크 인덱스(idx_calls_elderly_scheduled)가 책임집니다.
    # ORM UniqueConstraint로 강제하면 manual call까지 막을 수 있어 불일치가 발생할 수 있습니다.

    id = Column(Integer, primary_key=True, index=True)
    elderly_id = Column(Integer, ForeignKey("elderly.id", ondelete="CASCADE"), nullable=False, index=True)

    # 통화 정보
    call_type = Column(String(50), default="voice")
    trigger_type = Column(String(50), default="manual")  # 'manual', 'scheduled', 'emergency'
    started_at = Column(DateTime, nullable=False)
    ended_at = Column(DateTime, nullable=True)
    duration = Column(Integer, nullable=True)  # seconds
    scheduled_for = Column(DateTime, nullable=True)  # When this call was scheduled for

    # 상태
    status = Column(String(50), default="in_progress")  # 'in_progress', 'completed', 'failed', 'cancelled', 'missed'
    is_successful = Column(Boolean, default=True)

    # 메타데이터
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # 관계
    elderly = relationship("Elderly", back_populates="calls")
    messages = relationship("Message", back_populates="call", cascade="all, delete-orphan")
    analysis = relationship("CallAnalysis", back_populates="call", uselist=False, cascade="all, delete-orphan")
