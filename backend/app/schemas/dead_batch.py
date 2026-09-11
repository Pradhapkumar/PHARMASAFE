from datetime import datetime
from typing import Optional
from pydantic import BaseModel

class DeadBatchResponse(BaseModel):
    id: str
    batch_id: str
    batch_number: str
    gtin_barcode: str
    destruction_record_id: str
    destruction_cert_hash: str
    manufacturer_name: str
    quantity_destroyed: int
    destroyed_at: datetime
    blacklisted_at: datetime
    reentry_attempts_count: int
    last_reentry_detected_at: Optional[datetime] = None
    is_actively_monitored: bool

    class Config:
        from_attributes = True
