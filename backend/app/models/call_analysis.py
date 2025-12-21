from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime

from app.database import Base


class CallAnalysis(Base):
    __tablename__ = "call_analysis"

    id = Column(Integer, primary_key=True, index=True)
    call_id = Column(Integer, ForeignKey("calls.id", ondelete="CASCADE"), nullable=False, unique=True)

    # Analysis results
    summary = Column(Text, nullable=True)
    risk_score = Column(Integer, default=0)  # 0-100
    concerns = Column(Text, nullable=True)
    recommendations = Column(Text, nullable=True)

    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationship
    call = relationship("Call", back_populates="analysis")
