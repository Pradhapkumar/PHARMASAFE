import enum
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Float, DateTime, Enum, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from backend.app.db.base import Base

class TransferStageEnum(str, enum.Enum):
    MANUFACTURE_TO_DISTRIBUTOR = "MANUFACTURE_TO_DISTRIBUTOR"
    DISTRIBUTOR_TO_PHARMACY = "DISTRIBUTOR_TO_PHARMACY"
    PHARMACY_TO_REVERSE_CARRIER = "PHARMACY_TO_REVERSE_CARRIER"
    REVERSE_CARRIER_TO_DISPOSAL = "REVERSE_CARRIER_TO_DISPOSAL"
    DIRECT_TO_DISPOSAL = "DIRECT_TO_DISPOSAL"

class CustodyTransfer(Base):
    __tablename__ = "custody_transfers"

    id = Column(String(64), primary_key=True, index=True)
    batch_id = Column(String(64), ForeignKey("batches.id"), nullable=False, index=True)
    
    stage = Column(Enum(TransferStageEnum), nullable=False)
    from_organization_id = Column(String(64), ForeignKey("organizations.id"), nullable=False)
    to_organization_id = Column(String(64), ForeignKey("organizations.id"), nullable=False)
    
    transferred_quantity = Column(Integer, nullable=False)
    verified_quantity = Column(Integer, nullable=True)
    has_discrepancy = Column(Boolean, default=False)
    discrepancy_notes = Column(Text, nullable=True)
    
    from_actor_user_id = Column(String(64), ForeignKey("users.id"), nullable=True)
    to_actor_user_id = Column(String(64), ForeignKey("users.id"), nullable=True)
    
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    location_name = Column(String(255), nullable=True)
    
    digital_signature = Column(String(255), nullable=True)  # Cryptographic receipt
    is_confirmed = Column(Boolean, default=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)

    batch = relationship("Batch", back_populates="custody_transfers")
    from_organization = relationship("Organization", foreign_keys=[from_organization_id])
    to_organization = relationship("Organization", foreign_keys=[to_organization_id])
    from_actor = relationship("User", foreign_keys=[from_actor_user_id])
    to_actor = relationship("User", foreign_keys=[to_actor_user_id])
