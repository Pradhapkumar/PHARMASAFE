"""
Phase 8 Destruction Certificate Schemas.

Handles:
  - Certificate creation from a DISPOSED DisposalRecord
  - Certificate verification (SHA-256 hash check)
  - Response serialization with all required Phase 8 fields
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class DestructionRecordCreate(BaseModel):
    """
    Input to POST /api/v1/destruction/records.
    Requires a DISPOSED disposal record as source.
    """
    batch_id: str = Field(..., description="Batch ID or Batch Number to certify destruction for")
    disposal_id: Optional[str] = Field(None, description="Phase 7 DisposalRecord ID — required for Phase 8 proper flow")
    return_id: Optional[str] = Field(None, description="Optional: linked return request ID")

    quantity_destroyed: int = Field(..., gt=0, description="Quantity of units destroyed — must match disposal quantity")
    destruction_method: str = Field(..., example="HIGH_TEMP_INCINERATION_1200C",
                                    description="Operational destruction method code")

    witness_name: str = Field(..., description="Full name of destruction witness / regulatory observer")
    witness_badge_id: str = Field(..., description="Badge / license ID of witness")

    scale_weight_kg: Optional[str] = Field(None, description="Scale-verified total weight of destroyed material")
    evidence_reference: Optional[str] = Field(None, description="Reference to evidence documentation / media")
    evidence_media_url: Optional[str] = Field(None, description="URL to photographic evidence")
    facility_notes: Optional[str] = Field(None, description="Additional operational notes from disposal facility")


class DestructionRecordResponse(BaseModel):
    """
    Full destruction certificate response — serialized from DestructionRecord ORM model.
    """
    id: str
    certificate_id: Optional[str] = None
    batch_id: str
    disposal_id: Optional[str] = None
    return_id: Optional[str] = None
    facility_org_id: str

    quantity_destroyed: int
    destruction_method: str

    witness_name: str
    witness_badge_id: str

    scale_weight_kg: Optional[str] = None
    evidence_reference: Optional[str] = None
    evidence_media_url: Optional[str] = None
    facility_notes: Optional[str] = None

    certificate_sha256_hash: str
    certificate_url: Optional[str] = None

    verification_status: str
    verified_at: Optional[datetime] = None

    timestamp: datetime

    class Config:
        from_attributes = True


class CertificateVerifyResponse(BaseModel):
    """
    Response from POST /api/v1/destruction/records/{id}/verify.
    Carries verification outcome and final batch state.
    """
    success: bool
    certificate_id: Optional[str] = None
    batch_id: Optional[str] = None
    batch_number: Optional[str] = None
    destroyed_quantity: Optional[int] = None
    verification_status: str
    certificate_hash: Optional[str] = None
    hash_valid: Optional[bool] = None
    batch_status: Optional[str] = None
    dead_batch_registry_id: Optional[str] = None
    message: str
    error_code: Optional[str] = None


class DestructionCertificateSearchParams(BaseModel):
    """Query parameters for certificate lookup."""
    batch_id: Optional[str] = None
    facility_id: Optional[str] = None
    date_from: Optional[str] = None
    date_to: Optional[str] = None
    verification_status: Optional[str] = None
