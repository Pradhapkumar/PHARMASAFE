import enum
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, DateTime, Enum, ForeignKey, Text, JSON, Boolean
from sqlalchemy.orm import relationship
from backend.app.db.base import Base

class RiskLevelEnum(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class RiskScoreLog(Base):
    __tablename__ = "risk_score_logs"

    id = Column(String(64), primary_key=True, index=True)
    batch_id = Column(String(64), ForeignKey("batches.id"), nullable=False, index=True)
    
    composite_risk_score = Column(Float, nullable=False)  # 0.0 to 1.0
    risk_level = Column(Enum(RiskLevelEnum), nullable=False)
    
    expiry_risk_score = Column(Float, nullable=False)
    supply_chain_anomaly_score = Column(Float, nullable=False)
    reentry_risk_score = Column(Float, nullable=False)
    seller_reputation_score = Column(Float, default=1.0)
    
    explanation_summary = Column(Text, nullable=False)
    factor_breakdown = Column(JSON, nullable=True)  # Detailed feature importance dictionary
    
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)

    batch = relationship("Batch", back_populates="risk_scores")

class OnlineSurveillanceListing(Base):
    __tablename__ = "online_surveillance_listings"

    id = Column(String(64), primary_key=True, index=True)
    platform_name = Column(String(128), nullable=False)  # e.g., "IndiaMart", "TelegramGroup_PharmaDirect", "DarkNetRx"
    listing_url = Column(String(512), nullable=True)
    seller_name = Column(String(255), nullable=False)
    seller_identifier = Column(String(255), nullable=True)
    
    medicine_brand_claimed = Column(String(255), nullable=False)
    extracted_batch_number = Column(String(128), index=True, nullable=True)
    listed_price_inr = Column(Float, nullable=True)
    discount_percentage = Column(Float, nullable=True)
    
    is_dead_batch_match = Column(Boolean, default=False)
    risk_score = Column(Float, default=0.0)
    risk_level = Column(Enum(RiskLevelEnum), default=RiskLevelEnum.LOW)
    flagged_reasons = Column(Text, nullable=True)
    
    detected_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)

class AnomalyLog(Base):
    __tablename__ = "anomaly_logs"

    id = Column(String(64), primary_key=True, index=True)
    batch_id = Column(String(64), ForeignKey("batches.id"), nullable=False, index=True)
    anomaly_type = Column(String(128), nullable=False)  # "SPEED_VIOLATION", "GEO_JUMP", "QUANTITY_LEAKAGE", "UNAUTHORIZED_CUSTODY"
    severity = Column(Enum(RiskLevelEnum), nullable=False)
    description = Column(Text, nullable=False)
    raw_evidence = Column(JSON, nullable=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
