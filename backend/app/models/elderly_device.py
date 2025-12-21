from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime

from app.database import Base


class ElderlyDevice(Base):
    """
    Stores FCM push tokens for elderly users' devices.
    Supports multiple devices per elderly person.
    """
    __tablename__ = "elderly_devices"

    id = Column(Integer, primary_key=True, index=True)
    elderly_id = Column(
        Integer,
        ForeignKey("elderly.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # Device information
    fcm_token = Column(String(512), nullable=False, unique=True, index=True)
    platform = Column(String(20), default="ios")  # 'ios', 'android'
    device_name = Column(String(255), nullable=True)

    # Status
    is_active = Column(Boolean, default=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_used_at = Column(DateTime, nullable=True)

    # Relationship
    elderly = relationship("Elderly", back_populates="devices")
