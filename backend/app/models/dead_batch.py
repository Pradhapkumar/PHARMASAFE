from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from backend.app.db.base import Base

class DeadBatch(Base):
    __tablename__ = "dead_batch_registry"

    id = Column(String(64), primary_key=True, index=True)
    batch_id = Column(String(64), ForeignKey("batches.id"), unique=True, nullable=False, index=True)
    batch_number = Column(String(128), unique=True, index=True, nullable=False)
    gtin_barcode = Column(String(128), index=True, nullable=False)
    
    destruction_record_id = Column(String(64), ForeignKey("destruction_records.id"), unique=True, nullable=False)
    destruction_cert_hash = Column(String(64), index=True, nullable=False)
    
    manufacturer_name = Column(String(255), nullable=False)
    quantity_destroyed = Column(Integer, nullable=False)
    
    destroyed_at = Column(DateTime, nullable=False)
    blacklisted_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    
    reentry_attempts_count = Column(Integer, default=0)
    last_reentry_detected_at = Column(DateTime, nullable=True)
    is_actively_monitored = Column(Boolean, default=True)

    batch = relationship("Batch", back_populates="dead_batch_entry")
    destruction_record = relationship("DestructionRecord", back_populates="dead_batch_entry")
