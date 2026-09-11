import enum
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, Enum, ForeignKey, CheckConstraint, UniqueConstraint
from sqlalchemy.orm import relationship
from backend.app.db.base import Base


class InventoryTransactionType(str, enum.Enum):
    RECEIVED = "RECEIVED"
    TRANSFERRED_OUT = "TRANSFERRED_OUT"
    SOLD = "SOLD"
    QUARANTINED = "QUARANTINED"
    RETURNED = "RETURNED"
    ADJUSTED = "ADJUSTED"


class Inventory(Base):
    """Tracks stock held by each organization per batch."""
    __tablename__ = "inventory"

    __table_args__ = (
        UniqueConstraint("organization_id", "batch_id", name="uq_inventory_org_batch"),
        CheckConstraint("quantity_available >= 0", name="ck_inventory_nonneg_available"),
        CheckConstraint("quantity_quarantined >= 0", name="ck_inventory_nonneg_quarantined"),
        CheckConstraint("quantity_received >= 0", name="ck_inventory_nonneg_received"),
    )

    id = Column(String(64), primary_key=True, index=True)
    organization_id = Column(String(64), ForeignKey("organizations.id"), nullable=False, index=True)
    batch_id = Column(String(64), ForeignKey("batches.id"), nullable=False, index=True)

    quantity_received = Column(Integer, nullable=False, default=0)    # Total ever received
    quantity_available = Column(Integer, nullable=False, default=0)   # Currently dispense-able
    quantity_quarantined = Column(Integer, nullable=False, default=0) # Held pending investigation

    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc))

    organization = relationship("Organization", foreign_keys=[organization_id])
    batch = relationship("Batch", foreign_keys=[batch_id])
