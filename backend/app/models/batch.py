import enum
from datetime import datetime, date, timezone
from sqlalchemy import Column, String, Integer, Date, DateTime, Enum, ForeignKey, Boolean, Text
from sqlalchemy.orm import relationship
from backend.app.db.base import Base

class BatchStatusEnum(str, enum.Enum):
    MANUFACTURED = "MANUFACTURED"
    IN_DISTRIBUTION = "IN_DISTRIBUTION"
    AT_PHARMACY = "AT_PHARMACY"
    DISPENSED = "DISPENSED"
    EXPIRED = "EXPIRED"
    RECALLED = "RECALLED"
    FLAGGED_SUSPICIOUS = "FLAGGED_SUSPICIOUS"
    RETURN_INITIATED = "RETURN_INITIATED"
    RETURN_IN_TRANSIT = "RETURN_IN_TRANSIT"
    RECEIVED_AT_DISPOSAL = "RECEIVED_AT_DISPOSAL"
    DISPOSED = "DISPOSED"
    DESTROYED = "DESTROYED"
    DEAD_BATCH = "DEAD_BATCH"

class UnitEnum(str, enum.Enum):
    TABLET_STRIP = "TABLET_STRIP"
    BOTTLE = "BOTTLE"
    VIAL = "VIAL"
    BOX = "BOX"
    AMPOULE = "AMPOULE"

class Batch(Base):
    __tablename__ = "batches"

    id = Column(String(64), primary_key=True, index=True)
    batch_number = Column(String(128), unique=True, index=True, nullable=False)
    gtin_barcode = Column(String(128), index=True, nullable=False)
    medicine_id = Column(String(64), ForeignKey("medicines.id"), nullable=False)
    manufacturer_id = Column(String(64), ForeignKey("organizations.id"), nullable=False)
    
    mfg_date = Column(Date, nullable=False)
    expiry_date = Column(Date, nullable=False, index=True)
    
    initial_quantity = Column(Integer, nullable=False)
    current_quantity = Column(Integer, nullable=False)
    unit = Column(Enum(UnitEnum), default=UnitEnum.BOX)
    
    status = Column(Enum(BatchStatusEnum), default=BatchStatusEnum.MANUFACTURED, index=True, nullable=False)
    current_custodian_id = Column(String(64), ForeignKey("organizations.id"), nullable=True)
    
    is_recalled = Column(Boolean, default=False)
    recall_reason = Column(Text, nullable=True)
    recall_date = Column(DateTime, nullable=True)
    
    qr_payload = Column(Text, nullable=True)  # Cryptographic signature / signed payload string
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    medicine = relationship("Medicine", back_populates="batches")
    manufacturer_org = relationship("Organization", foreign_keys=[manufacturer_id], back_populates="batches")
    current_custodian = relationship("Organization", foreign_keys=[current_custodian_id])
    
    custody_transfers = relationship("CustodyTransfer", back_populates="batch", order_by="CustodyTransfer.timestamp.asc()")
    return_requests = relationship("ReturnRequest", back_populates="batch")
    destruction_record = relationship("DestructionRecord", back_populates="batch", uselist=False)
    dead_batch_entry = relationship("DeadBatch", back_populates="batch", uselist=False)
    risk_scores = relationship("RiskScoreLog", back_populates="batch", order_by="RiskScoreLog.timestamp.desc()")
