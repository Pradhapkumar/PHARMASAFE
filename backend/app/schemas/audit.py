from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel

class AuditLogResponse(BaseModel):
    id: str
    action: str
    entity_type: str
    entity_id: str
    actor_user_id: Optional[str] = None
    actor_role: Optional[str] = None
    actor_ip: Optional[str] = None
    details: Optional[str] = None
    previous_state: Optional[Dict[str, Any]] = None
    new_state: Optional[Dict[str, Any]] = None
    timestamp: datetime

    class Config:
        from_attributes = True

class ComplianceReportResponse(BaseModel):
    total_active_batches: int
    total_expired_batches: int
    total_recalled_batches: int
    total_returns_in_transit: int
    total_destroyed_dead_batches: int
    total_reentry_violations_prevented: int
    overall_system_integrity_score: float
