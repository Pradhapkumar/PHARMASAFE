from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.db.base import Base

class Medicine(Base):
    __tablename__ = "medicines"

    id = Column(String(64), primary_key=True, index=True)
    brand_name = Column(String(255), nullable=False, index=True)
    generic_name = Column(String(255), nullable=False, index=True)
    composition = Column(Text, nullable=True)
    dosage_form = Column(String(128), nullable=False)  # e.g., "Tablet", "Capsule", "Syrup", "Injection"
    strength = Column(String(64), nullable=False)     # e.g., "500mg", "10ml"
    storage_temp_min = Column(String(32), default="15°C")
    storage_temp_max = Column(String(32), default="25°C")
    manufacturer_id = Column(String(64), ForeignKey("organizations.id"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    batches = relationship("Batch", back_populates="medicine")
