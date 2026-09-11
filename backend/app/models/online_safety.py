"""
Phase 9: Online Medicine Safety & Listing Verification Model.

Stores online listings and deterministic verification outcomes (ALLOW, REVIEW, BLOCK)
evaluated against seller, product, batch, inventory, lifecycle, certificate, and registry data.
"""
import enum
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Float, DateTime, Enum, ForeignKey, Text, JSON, Boolean
from sqlalchemy.orm import relationship
from backend.app.db.base import Base


class ListingDecisionEnum(str, enum.Enum):
    ALLOW = "ALLOW"
    REVIEW = "REVIEW"
    BLOCK = "BLOCK"


class ListingStatusEnum(str, enum.Enum):
    ACTIVE = "ACTIVE"
    PENDING_REVIEW = "PENDING_REVIEW"
    BLOCKED = "BLOCKED"
    TAKEDOWN_REQUESTED = "TAKEDOWN_REQUESTED"
    PERMITTED = "PERMITTED"


class ListingRiskLevelEnum(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class OnlineMedicineListing(Base):
    """
    Authoritative record of an online medicine listing evaluated by the PharmaSafe
    deterministic listing verification engine.
    """
    __tablename__ = "online_medicine_listings"

    id = Column(String(64), primary_key=True, index=True)
    listing_reference = Column(String(128), unique=True, index=True, nullable=False)

    # Marketplace details
    platform_name = Column(String(128), nullable=False, index=True)
    listing_url = Column(String(512), nullable=True)

    # Claimed merchant details
    seller_name = Column(String(255), nullable=False)
    seller_org_id = Column(String(64), ForeignKey("organizations.id"), nullable=True, index=True)
    seller_license_number = Column(String(128), nullable=True, index=True)

    # Claimed product & batch details
    claimed_product_name = Column(String(255), nullable=False)
    medicine_id = Column(String(64), ForeignKey("medicines.id"), nullable=True, index=True)
    batch_number = Column(String(128), index=True, nullable=True)
    batch_id = Column(String(64), ForeignKey("batches.id"), nullable=True, index=True)

    # Commercial parameters
    offered_quantity = Column(Integer, nullable=True)
    listed_price_inr = Column(Float, nullable=True)

    # Claimed cryptographic tokens / credentials
    claimed_qr_payload = Column(Text, nullable=True)
    claimed_certificate_hash = Column(String(64), nullable=True, index=True)

    # Deterministic Evaluation Outcome
    verification_decision = Column(Enum(ListingDecisionEnum), nullable=False, index=True)
    risk_level = Column(Enum(ListingRiskLevelEnum), nullable=False, index=True)
    risk_score = Column(Float, nullable=False)  # 0.0 to 1.0

    # Detailed Audit Breakdown
    decision_reasons = Column(JSON, nullable=False, default=list)
    stage_checks = Column(JSON, nullable=False, default=dict)

    # Lifecycle & Governance Status
    listing_status = Column(Enum(ListingStatusEnum), nullable=False, default=ListingStatusEnum.ACTIVE, index=True)
    takedown_requested = Column(Boolean, default=False)
    takedown_requested_at = Column(DateTime, nullable=True)
    enforcement_notes = Column(Text, nullable=True)
    reviewed_by_user_id = Column(String(64), ForeignKey("users.id"), nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    seller_org = relationship("Organization", foreign_keys=[seller_org_id])
    medicine = relationship("Medicine", foreign_keys=[medicine_id])
    batch = relationship("Batch", foreign_keys=[batch_id])
    reviewed_by_user = relationship("User", foreign_keys=[reviewed_by_user_id])
