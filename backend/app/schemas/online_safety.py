"""
Phase 9: Online Medicine Safety & Listing Verification Schemas.
"""
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class StageCheckResult(BaseModel):
    """Result of an individual check in the 11-step pipeline."""
    stage: str
    status: str = Field(..., description="PASSED | WARNING | FAILED")
    details: str
    metadata: Optional[Dict[str, Any]] = None


class ListingVerificationRequest(BaseModel):
    """Input payload to evaluate an online listing."""
    platform_name: str = Field(..., description="Platform e.g. 1mg, IndiaMart, Telegram", example="Apollo Pharmacy Online")
    listing_url: Optional[str] = Field(None, example="https://apollopharmacy.in/item/amox-500")
    seller_name: str = Field(..., example="Apollo Health Retail Ltd")
    seller_org_id: Optional[str] = Field(None, description="Optional PharmaSafe organization ID")
    seller_license_number: Optional[str] = Field(None, example="DL-KA-2024-00123")
    
    claimed_product_name: str = Field(..., example="Amoxil 500mg Tablets")
    batch_number: Optional[str] = Field(None, example="AMX-2026-001")
    offered_quantity: Optional[int] = Field(None, ge=1, example=50)
    listed_price_inr: Optional[float] = Field(None, gt=0, example=120.0)
    
    claimed_qr_payload: Optional[str] = Field(None, description="Claimed digital cryptographic QR payload")
    claimed_certificate_hash: Optional[str] = Field(None, description="Claimed SHA-256 certificate hash")


class ListingVerificationResponse(BaseModel):
    """Full deterministic verification outcome."""
    decision: str = Field(..., description="ALLOW | REVIEW | BLOCK")
    risk_level: str = Field(..., description="LOW | MEDIUM | HIGH | CRITICAL")
    risk_score: float = Field(..., description="0.0 to 1.0 risk score")
    summary: str
    decision_reasons: List[str] = Field(default_factory=list)
    stage_checks: Dict[str, StageCheckResult]
    
    batch_matched: bool = False
    seller_matched: bool = False
    product_matched: bool = False
    dead_batch_detected: bool = False


class ListingCreate(ListingVerificationRequest):
    """Payload to ingest and persist a verified listing."""
    pass


class ListingResponse(BaseModel):
    """Serialized representation of an evaluated and stored online medicine listing."""
    id: str
    listing_reference: str
    platform_name: str
    listing_url: Optional[str] = None
    seller_name: str
    seller_org_id: Optional[str] = None
    seller_license_number: Optional[str] = None
    claimed_product_name: str
    medicine_id: Optional[str] = None
    batch_number: Optional[str] = None
    batch_id: Optional[str] = None
    offered_quantity: Optional[int] = None
    listed_price_inr: Optional[float] = None
    claimed_qr_payload: Optional[str] = None
    claimed_certificate_hash: Optional[str] = None
    
    verification_decision: str
    risk_level: str
    risk_score: float
    decision_reasons: List[str]
    stage_checks: Dict[str, Any]
    
    listing_status: str
    takedown_requested: bool = False
    takedown_requested_at: Optional[datetime] = None
    enforcement_notes: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ListingEnforceRequest(BaseModel):
    """Action payload for regulatory enforcement."""
    action: str = Field(..., description="ISSUE_TAKEDOWN | CONFIRM_BLOCK | APPROVE_PERMITTED")
    enforcement_notes: Optional[str] = None
