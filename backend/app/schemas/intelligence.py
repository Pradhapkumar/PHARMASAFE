from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field
from backend.app.models.intelligence import RiskLevelEnum

class RiskScoreResponse(BaseModel):
    batch_id: str
    composite_risk_score: float
    risk_level: RiskLevelEnum
    expiry_risk_score: float
    supply_chain_anomaly_score: float
    reentry_risk_score: float
    seller_reputation_score: float
    explanation_summary: str
    factor_breakdown: Optional[Dict[str, Any]] = None
    timestamp: datetime

    class Config:
        from_attributes = True

class BatchRiskEvaluationResponse(BaseModel):
    """Full explainable AI evaluation response (Phase 10)."""
    batch_id: str
    batch_number: Optional[str] = None
    composite_risk_score: float = Field(..., description="0.0 to 1.0 composite risk index")
    risk_level: RiskLevelEnum = Field(..., description="LOW | MEDIUM | HIGH | CRITICAL")
    expiry_risk_score: float
    movement_anomaly_score: float
    quantity_anomaly_score: float
    reentry_risk_score: float
    seller_listing_risk_score: float
    explanation_summary: str
    reasons: List[str] = Field(default_factory=list)
    contributing_features: Dict[str, Any] = Field(default_factory=dict)
    anomalies_detected: List[Dict[str, Any]] = Field(default_factory=list)
    model_version: str
    deterministic_safety_preserved: bool = True
    timestamp: datetime

    class Config:
        from_attributes = True

class IntelligenceSummaryResponse(BaseModel):
    """Aggregated AI risk intelligence telemetry across all active lots."""
    total_batches_monitored: int
    high_risk_lots_count: int
    anomalies_active_count: int
    reentry_threats_count: int
    average_system_risk_score: float
    model_version: str
    last_evaluated_at: datetime

class BatchSimulationRequest(BaseModel):
    """Payload to simulate AI risk under hypothetical supply chain disruptions."""
    batch_number: Optional[str] = "B1001"
    days_to_expiry: Optional[int] = 180
    transit_speed_kmh: Optional[float] = 60.0
    shrinkage_quantity: Optional[int] = 0
    illicit_marketplace_listing: Optional[bool] = False
    is_dead_batch_simulated: Optional[bool] = False
    marketplace_discount_percent: Optional[float] = 0.0

class OnlineSurveillanceCreate(BaseModel):
    platform_name: str
    listing_url: Optional[str] = None
    seller_name: str
    seller_identifier: Optional[str] = None
    medicine_brand_claimed: str
    extracted_batch_number: Optional[str] = None
    listed_price_inr: Optional[float] = None
    discount_percentage: Optional[float] = None

class OnlineSurveillanceResponse(BaseModel):
    id: str
    platform_name: str
    listing_url: Optional[str] = None
    seller_name: str
    medicine_brand_claimed: str
    extracted_batch_number: Optional[str] = None
    listed_price_inr: Optional[float] = None
    discount_percentage: Optional[float] = None
    is_dead_batch_match: bool
    risk_score: float
    risk_level: RiskLevelEnum
    flagged_reasons: Optional[str] = None
    detected_at: datetime

    class Config:
        from_attributes = True

class AnomalyResponse(BaseModel):
    id: str
    batch_id: str
    anomaly_type: str
    severity: RiskLevelEnum
    description: str
    raw_evidence: Optional[Dict[str, Any]] = None
    timestamp: datetime

    class Config:
        from_attributes = True
