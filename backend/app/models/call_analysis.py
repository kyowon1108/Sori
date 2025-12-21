from sqlalchemy import Column, Integer, String, Text, DateTime, Float, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime

from app.database import Base


class CallAnalysis(Base):
    __tablename__ = "call_analysis"

    id = Column(Integer, primary_key=True, index=True)
    call_id = Column(Integer, ForeignKey("calls.id", ondelete="CASCADE"), nullable=False, unique=True)

    # 분석 결과
    risk_level = Column(String(20), default="low")  # 'low', 'medium', 'high', 'critical'
    sentiment_score = Column(Float, default=0.0)  # -1.0 ~ 1.0
    summary = Column(Text, nullable=True)
    recommendations = Column(JSON, nullable=True)

    # 메타데이터
    analyzed_at = Column(DateTime, default=datetime.utcnow)

    # 관계
    call = relationship("Call", back_populates="analysis")
