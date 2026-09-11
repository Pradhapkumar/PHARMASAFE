from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from backend.app.models.verification import VerificationStatusEnum

class VerificationScanRequest(BaseModel):
    scanned_code: str  # Batch number or full QR string
    code_type: str = "QR_CODE"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    device_info: Optional[str] = "PharmaSafe Scanner v1.0"

class VerificationScanResponse(BaseModel):
    verification_status: VerificationStatusEnum
    batch_number: Optional[str] = None
    brand_name: Optional[str] = None
    generic_name: Optional[str] = None
    manufacturer_name: Optional[str] = None
    is_expired: bool = False
    is_recalled: bool = False
    is_dead_batch_reentry: bool = False
    warning_message: Optional[str] = None
    timestamp: datetime
    scan_id: str
