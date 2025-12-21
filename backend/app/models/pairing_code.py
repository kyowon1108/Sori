from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime

from app.database import Base


class ElderlyPairingCode(Base):
    """
    Stores 6-digit pairing codes for elderly device registration.
    Codes are hashed with SHA256 + pepper for security.
    """
    __tablename__ = "elderly_pairing_codes"

    id = Column(Integer, primary_key=True, index=True)
    elderly_id = Column(
        Integer,
        ForeignKey("elderly.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # Hashed code (SHA256)
    code_hash = Column(String(64), nullable=False, unique=True, index=True)

    # Expiration and usage tracking
    expires_at = Column(DateTime, nullable=False, index=True)
    used_at = Column(DateTime, nullable=True)

    # Who created this code
    created_by_user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )

    # Brute-force protection
    attempt_count = Column(Integer, default=0)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    elderly = relationship("Elderly")
    created_by = relationship("User")
