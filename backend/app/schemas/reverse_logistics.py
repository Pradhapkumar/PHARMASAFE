from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from backend.app.models.reverse_logistics import ReturnReasonEnum, ReturnStatusEnum

class ReturnRequestCreate(BaseModel):
    batch_id: Optional[str] = None
    batch_number: Optional[str] = None
    destination_facility_id: str
    quantity: int = Field(..., gt=0)
    reason: ReturnReasonEnum
    notes: Optional[str] = None
    carrier_name: Optional[str] = None
    carrier_tracking_ref: Optional[str] = None
    driver_badge: Optional[str] = None

class ReturnStatusUpdate(BaseModel):
    status: ReturnStatusEnum
    notes: Optional[str] = None
    manifest_hash: Optional[str] = None
    received_quantity: Optional[int] = None  # For quantity reconciliation
    scale_weight_kg: Optional[str] = None    # Tare scale weight intake
    carrier_name: Optional[str] = None
    carrier_tracking_ref: Optional[str] = None
    driver_badge: Optional[str] = None

class ReturnRouteToDisposalRequest(BaseModel):
    disposal_facility_id: str
    carrier_name: Optional[str] = None
    carrier_tracking_ref: Optional[str] = None
    driver_badge: Optional[str] = None
    notes: Optional[str] = None

class ReturnRequestResponse(BaseModel):
    id: str
    batch_id: str
    initiator_org_id: str
    destination_facility_id: str
    quantity: int
    received_quantity: Optional[int] = None
    scale_weight_kg: Optional[str] = None
    carrier_name: Optional[str] = None
    carrier_tracking_ref: Optional[str] = None
    driver_badge: Optional[str] = None
    reason: ReturnReasonEnum
    status: ReturnStatusEnum
    tracking_code: str
    manifest_hash: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
