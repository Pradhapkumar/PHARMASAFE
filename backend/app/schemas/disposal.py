from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

class DisposalIntakeCreate(BaseModel):
    return_id: Optional[str] = None
    batch_id: Optional[str] = None
    batch_number: Optional[str] = None
    disposed_quantity: int = Field(..., gt=0)
    disposal_method: str
    scale_weight_kg: Optional[str] = None
    evidence_media_url: Optional[str] = None
    notes: Optional[str] = None

class DisposalCompletionRequest(BaseModel):
    notes: Optional[str] = None
    evidence_media_url: Optional[str] = None

class DisposalRecordResponse(BaseModel):
    id: str
    return_id: Optional[str] = None
    batch_id: str
    facility_org_id: str
    operator_user_id: Optional[str] = None
    disposed_quantity: int
    disposal_method: str
    scale_weight_kg: Optional[str] = None
    evidence_media_url: Optional[str] = None
    status: str
    notes: Optional[str] = None
    timestamp: datetime

    class Config:
        from_attributes = True
