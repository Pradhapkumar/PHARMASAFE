import enum
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, Enum, ForeignKey, Boolean, Text
from sqlalchemy.orm import relationship
from backend.app.db.base import Base


class SaleBlockReason(str, enum.Enum):
    EXPIRED = "EXPIRED"
    RECALLED = "RECALLED"
    DESTROYED = "DESTROYED"
    QUARANTINED = "QUARANTINED"
    FLAGGED_SUSPICIOUS = "FLAGGED_SUSPICIOUS"
    INSUFFICIENT_STOCK = "INSUFFICIENT_STOCK"
    INVALID_QUANTITY = "INVALID_QUANTITY"
    NOT_OWNER = "NOT_OWNER"
    SUSPENDED = "SUSPENDED"
    NOT_FOUND = "NOT_FOUND"


class Sale(Base):
    """Records every sale attempt — both successful and blocked."""
    __tablename__ = "sales"

    id = Column(String(64), primary_key=True, index=True)
    batch_id = Column(String(64), ForeignKey("batches.id"), nullable=False, index=True)
    seller_org_id = Column(String(64), ForeignKey("organizations.id"), nullable=False, index=True)
    sold_by_user_id = Column(String(64), ForeignKey("users.id"), nullable=True)

    quantity_sold = Column(Integer, nullable=False)
    customer_reference = Column(String(255), nullable=True)  # Patient/customer ref

    sale_allowed = Column(Boolean, nullable=False)
    block_reason = Column(Enum(SaleBlockReason), nullable=True)
    block_message = Column(Text, nullable=True)

    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)

    batch = relationship("Batch", foreign_keys=[batch_id])
    seller_org = relationship("Organization", foreign_keys=[seller_org_id])
    sold_by_user = relationship("User", foreign_keys=[sold_by_user_id])
