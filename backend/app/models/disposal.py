from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from backend.app.db.base import Base

class DisposalRecord(Base):
    __tablename__ = "disposal_records"

    id = Column(String(64), primary_key=True, index=True)
    return_id = Column(String(64), ForeignKey("return_requests.id"), nullable=True, index=True)
    batch_id = Column(String(64), ForeignKey("batches.id"), nullable=False, index=True)
    
    facility_org_id = Column(String(64), ForeignKey("organizations.id"), nullable=False)
    operator_user_id = Column(String(64), ForeignKey("users.id"), nullable=True)
    
    disposed_quantity = Column(Integer, nullable=False)
    disposal_method = Column(String(128), nullable=False)  # e.g., "HIGH_TEMP_INCINERATION_1200C", "CHEMICAL_DENATURATION"
    scale_weight_kg = Column(String(32), nullable=True)
    evidence_media_url = Column(String(512), nullable=True)
    
    status = Column(String(32), default="DISPOSAL_IN_PROGRESS", index=True, nullable=False)  # "INTAKE", "DISPOSAL_IN_PROGRESS", "DISPOSED"
    notes = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)

    batch = relationship("Batch")
    return_request = relationship("ReturnRequest")
    facility_org = relationship("Organization", foreign_keys=[facility_org_id])
    operator_user = relationship("User", foreign_keys=[operator_user_id])
