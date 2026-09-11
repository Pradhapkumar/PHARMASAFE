import enum
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, Enum, ForeignKey, Text
from sqlalchemy.orm import relationship
from backend.app.db.base import Base

class ReturnReasonEnum(str, enum.Enum):
    EXPIRED = "EXPIRED"
    RECALLED = "RECALLED"
    SUSPECT_COUNTERFEIT = "SUSPECT_COUNTERFEIT"
    DAMAGED_IN_TRANSIT = "DAMAGED_IN_TRANSIT"
    STORAGE_BREACH = "STORAGE_BREACH"
    CUSTOMER_RETURN = "CUSTOMER_RETURN"

class ReturnStatusEnum(str, enum.Enum):
    RETURN_REQUESTED = "RETURN_REQUESTED"
    INITIATED = "INITIATED"
    PICKUP_SCHEDULED = "PICKUP_SCHEDULED"
    PICKED_UP = "PICKED_UP"
    PICKUP_COMPLETED = "PICKUP_COMPLETED"
    IN_TRANSIT = "IN_TRANSIT"
    RECEIVED = "RECEIVED"
    RECEIVED_AT_FACILITY = "RECEIVED_AT_FACILITY"
    UNDER_VERIFICATION = "UNDER_VERIFICATION"
    VERIFIED = "VERIFIED"
    RECONCILED = "RECONCILED"
    AWAITING_DISPOSAL = "AWAITING_DISPOSAL"
    ROUTED_TO_DISPOSAL = "ROUTED_TO_DISPOSAL"
    DISPOSAL_ACCEPTED = "DISPOSAL_ACCEPTED"
    DISPOSAL_IN_PROGRESS = "DISPOSAL_IN_PROGRESS"
    RECEIVED_AT_DISPOSAL = "RECEIVED_AT_DISPOSAL"
    DISPOSED = "DISPOSED"
    CANCELLED = "CANCELLED"

class ReturnRequest(Base):
    __tablename__ = "return_requests"

    id = Column(String(64), primary_key=True, index=True)
    batch_id = Column(String(64), ForeignKey("batches.id"), nullable=False, index=True)
    
    initiator_org_id = Column(String(64), ForeignKey("organizations.id"), nullable=False)
    initiator_user_id = Column(String(64), ForeignKey("users.id"), nullable=True)
    destination_facility_id = Column(String(64), ForeignKey("organizations.id"), nullable=False)
    
    quantity = Column(Integer, nullable=False)
    received_quantity = Column(Integer, nullable=True)
    scale_weight_kg = Column(String(32), nullable=True)
    carrier_name = Column(String(128), nullable=True)
    carrier_tracking_ref = Column(String(128), nullable=True)
    driver_badge = Column(String(64), nullable=True)
    reason = Column(Enum(ReturnReasonEnum), nullable=False)
    status = Column(Enum(ReturnStatusEnum), default=ReturnStatusEnum.INITIATED, index=True, nullable=False)
    
    tracking_code = Column(String(128), unique=True, index=True, nullable=False)
    manifest_hash = Column(String(255), nullable=True)
    notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    batch = relationship("Batch", back_populates="return_requests")
    initiator_org = relationship("Organization", foreign_keys=[initiator_org_id])
    initiator_user = relationship("User", foreign_keys=[initiator_user_id])
    destination_facility = relationship("Organization", foreign_keys=[destination_facility_id])
    
    destruction_record = relationship("DestructionRecord", back_populates="return_request", uselist=False)
