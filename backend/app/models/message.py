from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime

from app.database import Base


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    call_id = Column(Integer, ForeignKey("calls.id", ondelete="CASCADE"), nullable=False, index=True)

    # 메시지 정보
    role = Column(String(50), nullable=False)  # 'user', 'assistant'
    content = Column(Text, nullable=False)

    # 메타데이터
    created_at = Column(DateTime, default=datetime.utcnow)

    # 관계
    call = relationship("Call", back_populates="messages")
