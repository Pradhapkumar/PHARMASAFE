"""
Evidence Schemas — Phase 11: Advanced Evidence + Analytics.
"""
from typing import Optional, Dict, Any, List
from datetime import datetime
from pydantic import BaseModel, Field
from backend.app.models.evidence import EvidenceTypeEnum, EvidenceStatusEnum, OCRStatusEnum, ScreeningResultEnum


class EvidenceCreate(BaseModel):
    entity_type: str = Field(..., description="Target entity type: BATCH, RETURN, DISPOSAL, CERTIFICATE, LISTING")
    entity_id: str = Field(..., description="Target entity ID or business identifier")
    evidence_type: EvidenceTypeEnum
    description: Optional[str] = None
    batch_id: Optional[str] = None
    return_id: Optional[str] = None
    disposal_id: Optional[str] = None
    certificate_id: Optional[str] = None
    listing_id: Optional[str] = None


class EvidenceResponse(BaseModel):
    id: str
    evidence_id: str
    entity_type: str
    entity_id: str
    evidence_type: EvidenceTypeEnum
    file_name: str
    file_type: str
    file_size: int
    storage_reference: str
    checksum: str
    checksum_algorithm: str
    description: Optional[str] = None
    status: EvidenceStatusEnum
    is_finalized: bool
    ocr_status: OCRStatusEnum
    ocr_extracted_data: Optional[Dict[str, Any]] = None
    ocr_confidence: Optional[int] = None
    screening_result: ScreeningResultEnum
    screening_details: Optional[Dict[str, Any]] = None
    captured_at: datetime
    created_at: datetime

    class Config:
        from_attributes = True


class PackageComparisonRequest(BaseModel):
    batch_number: str
    simulated_ocr_text: Optional[str] = None
    captured_fields: Optional[Dict[str, Any]] = None


class PackageComparisonResponse(BaseModel):
    verdict: str   # MATCH, MISMATCH, REVIEW_REQUIRED
    decision: str  # VERIFIED, REVIEW_REQUIRED, INSUFFICIENT_DATA
    explanation: str
    field_comparisons: Dict[str, Any]
    evaluated_fields_count: int
    match_count: int
    authoritative_batch_number: str
    timestamp: str
