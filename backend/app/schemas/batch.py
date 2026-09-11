from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from backend.app.models.batch import BatchStatusEnum, UnitEnum
from backend.app.models.custody import TransferStageEnum

class MedicineBase(BaseModel):
    brand_name: str
    generic_name: str
    composition: Optional[str] = None
    dosage_form: str
    strength: str
    storage_temp_min: str = "15°C"
    storage_temp_max: str = "25°C"

class MedicineCreate(MedicineBase):
    manufacturer_id: Optional[str] = None

class MedicineResponse(MedicineBase):
    id: str
    manufacturer_id: str
    created_at: datetime

    class Config:
        from_attributes = True

class BatchCreate(BaseModel):
    batch_number: str = Field(..., example="AMX-2026-9901")
    gtin_barcode: Optional[str] = Field(None, example="08901234567890")
    medicine_id: str
    mfg_date: date
    expiry_date: date
    initial_quantity: int = Field(..., gt=0)
    unit: UnitEnum = UnitEnum.BOX
    qr_payload: Optional[str] = None

class BatchRecallRequest(BaseModel):
    recall_reason: str
    action_notes: Optional[str] = None

class BatchUpdateStatus(BaseModel):
    status: BatchStatusEnum
    notes: Optional[str] = None

class CustodyTransferCreate(BaseModel):
    batch_id: str
    stage: TransferStageEnum
    to_organization_id: str
    transferred_quantity: int
    verified_quantity: Optional[int] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_name: Optional[str] = None
    digital_signature: Optional[str] = None

class CustodyTransferResponse(BaseModel):
    id: str
    batch_id: str
    stage: TransferStageEnum
    from_organization_id: str
    to_organization_id: str
    transferred_quantity: int
    verified_quantity: Optional[int] = None
    has_discrepancy: bool
    discrepancy_notes: Optional[str] = None
    location_name: Optional[str] = None
    timestamp: datetime

    class Config:
        from_attributes = True

class BatchResponse(BaseModel):
    id: str
    batch_number: str
    gtin_barcode: str
    medicine_id: str
    manufacturer_id: str
    mfg_date: date
    expiry_date: date
    initial_quantity: int
    current_quantity: int
    unit: UnitEnum
    status: BatchStatusEnum
    current_custodian_id: Optional[str] = None
    is_recalled: bool
    recall_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class BatchPassportResponse(BaseModel):
    batch_id: str
    batch_number: str
    gtin_barcode: str
    status: BatchStatusEnum
    medicine: MedicineResponse
    manufacturer_name: str
    mfg_date: date
    expiry_date: date
    initial_quantity: int
    current_quantity: int
    unit: UnitEnum
    current_custodian_name: Optional[str] = None
    is_recalled: bool
    recall_reason: Optional[str] = None
    is_dead_batch: bool = False
    destruction_cert_hash: Optional[str] = None
    custody_history: List[CustodyTransferResponse] = []
    latest_risk_score: Optional[float] = None
    risk_level: Optional[str] = None
    created_at: datetime


class BatchEventResponse(BaseModel):
    id: str
    event_type: str
    timestamp: datetime
    actor: str
    organization: str
    quantity: Optional[int] = None
    location: Optional[str] = None
    previous_status: Optional[str] = None
    new_status: Optional[str] = None
    details: Optional[str] = None


class ManufacturerDashboardSummary(BaseModel):
    total_batches: int
    active_batches: int
    near_expiry_batches: int
    expired_batches: int
    recalled_batches: int
    distributed_batches: int
    returned_batches: int
    destroyed_batches: int
    total_units_manufactured: int
    total_units_in_inventory: int
    recent_batches: List[BatchResponse]
    recent_transfers: List[CustodyTransferResponse]
    recent_returns: List[dict]
    critical_alerts: List[dict]
    status_distribution: dict

