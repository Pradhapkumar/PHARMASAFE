import enum
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Enum, Boolean, Text
from backend.app.db.base import Base


class AlertSeverity(str, enum.Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"
    INFO = "INFO"


class AlertType(str, enum.Enum):
    SALE_BLOCKED_EXPIRED = "SALE_BLOCKED_EXPIRED"
    SALE_BLOCKED_RECALLED = "SALE_BLOCKED_RECALLED"
    SALE_BLOCKED_DESTROYED = "SALE_BLOCKED_DESTROYED"
    QUANTITY_DISCREPANCY = "QUANTITY_DISCREPANCY"
    DEAD_BATCH_REENTRY = "DEAD_BATCH_REENTRY"
    RECALL_ISSUED = "RECALL_ISSUED"
    CERTIFICATE_MISMATCH = "CERTIFICATE_MISMATCH"
    SUSPICIOUS_LISTING = "SUSPICIOUS_LISTING"
    NEAR_EXPIRY_WARNING = "NEAR_EXPIRY_WARNING"
    SYSTEM_INFO = "SYSTEM_INFO"


class Alert(Base):
    """Central alert hub for all system-generated compliance notifications."""
    __tablename__ = "alerts"

    id = Column(String(64), primary_key=True, index=True)
    alert_type = Column(Enum(AlertType), nullable=False, index=True)
    severity = Column(Enum(AlertSeverity), nullable=False, index=True)

    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)

    entity_type = Column(String(64), nullable=True)   # "BATCH", "RETURN", "SALE", etc.
    entity_id = Column(String(64), nullable=True, index=True)

    is_read = Column(Boolean, default=False, nullable=False)
    is_resolved = Column(Boolean, default=False, nullable=False)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
