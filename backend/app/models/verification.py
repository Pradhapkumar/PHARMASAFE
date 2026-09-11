import enum
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, DateTime, Enum, ForeignKey, Text, Boolean
from backend.app.db.base import Base

class VerificationStatusEnum(str, enum.Enum):
    AUTHENTIC = "AUTHENTIC"
    EXPIRED = "EXPIRED"
    RECALLED = "RECALLED"
    FLAGGED_SUSPICIOUS = "FLAGGED_SUSPICIOUS"
    DEAD_BATCH_REENTRY_DETECTED = "DEAD_BATCH_REENTRY_DETECTED"
    UNKNOWN_NOT_FOUND = "UNKNOWN_NOT_FOUND"

class VerificationScan(Base):
    __tablename__ = "verification_scans"

    id = Column(String(64), primary_key=True, index=True)
    scanned_code = Column(String(255), index=True, nullable=False)
    code_type = Column(String(64), default="QR_CODE")  # "QR_CODE", "BARCODE", "MANUAL_INPUT"
    
    batch_id = Column(String(64), ForeignKey("batches.id"), nullable=True)
    batch_number = Column(String(128), nullable=True, index=True)
    
    verification_status = Column(Enum(VerificationStatusEnum), nullable=False, index=True)
    is_critical_alert = Column(Boolean, default=False)
    alert_details = Column(Text, nullable=True)
    
    scanned_by_user_id = Column(String(64), ForeignKey("users.id"), nullable=True)
    scanned_by_role = Column(String(64), nullable=True)
    
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    device_info = Column(String(255), nullable=True)
    
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
