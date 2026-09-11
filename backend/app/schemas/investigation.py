"""
Investigation Schemas — Phase 11: Advanced Evidence + Analytics.
"""
from typing import Optional, Dict, Any, List
from datetime import datetime
from pydantic import BaseModel, Field
from backend.app.models.investigation import CasePriorityEnum, CaseStatusEnum


class NoteCreate(BaseModel):
    note: str = Field(..., min_length=2, description="Investigator finding or note")


class NoteResponse(BaseModel):
    id: str
    case_id: str
    author_name: str
    author_role: str
    note: str
    created_at: datetime

    class Config:
        from_attributes = True


class EvidenceLinkCreate(BaseModel):
    evidence_id: str
    relevance_notes: Optional[str] = None


class InvestigationCaseCreate(BaseModel):
    title: str = Field(..., min_length=4)
    priority: CasePriorityEnum = CasePriorityEnum.MEDIUM
    entity_type: str = Field(..., description="BATCH, SELLER, LISTING, RETURN")
    entity_id: str
    batch_id: Optional[str] = None
    summary: str = Field(..., min_length=5)
    assigned_to_name: Optional[str] = None


class InvestigationCaseUpdate(BaseModel):
    status: Optional[CaseStatusEnum] = None
    priority: Optional[CasePriorityEnum] = None
    findings: Optional[str] = None
    resolution_notes: Optional[str] = None
    assigned_to_name: Optional[str] = None


class InvestigationCaseSummaryResponse(BaseModel):
    id: str
    case_id: str
    title: str
    priority: CasePriorityEnum
    status: CaseStatusEnum
    entity_type: str
    entity_id: str
    batch_id: Optional[str] = None
    assigned_to_name: Optional[str] = None
    risk_level: str
    risk_score: float
    created_at: datetime
    updated_at: datetime
    closed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class InvestigationCaseDetailResponse(InvestigationCaseSummaryResponse):
    summary: str
    findings: Optional[str] = None
    resolution_notes: Optional[str] = None
    risk_factors: Optional[Dict[str, Any]] = None
    notes: List[NoteResponse] = []
    evidence_items: List[Dict[str, Any]] = []
    timeline: List[Dict[str, Any]] = []
    custody_chain: List[Dict[str, Any]] = []

    class Config:
        from_attributes = True
