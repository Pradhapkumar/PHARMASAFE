"""
Analytics & Report Schemas — Phase 11: Advanced Evidence + Analytics.
"""
from typing import Optional, Dict, Any, List
from datetime import datetime
from pydantic import BaseModel


class AnalyticsOverviewResponse(BaseModel):
    total_batches: int
    destroyed_batches: int
    disposed_batches: int
    active_returns: int
    dead_registry_count: int
    blocked_sales: int
    online_takedowns: int
    open_investigations: int
    evidence_items_count: int
    fleet_risk_index: float
    system_compliance_score: float
    timestamp: str


class ReverseLogisticsAnalyticsResponse(BaseModel):
    total_returns: int
    discrepancy_returns: int
    discrepancy_rate_percent: float
    average_transit_days: float
    disposal_handover_rate: float
    reason_distribution: List[Dict[str, Any]]
    monthly_trend: List[Dict[str, Any]]


class DisposalAnalyticsResponse(BaseModel):
    total_disposed_batches: int
    total_units_disposed: int
    average_processing_hours: float
    weight_scale_compliance_pct: float
    by_method: List[Dict[str, Any]]
    facility_throughput: List[Dict[str, Any]]


class DestructionAnalyticsResponse(BaseModel):
    total_certificates_issued: int
    verified_certificates: int
    dead_registry_entries: int
    total_destroyed_units: int
    hash_integrity_rate_percent: float
    dead_batch_closure_rate_percent: float
    status_breakdown: List[Dict[str, Any]]


class OnlineSafetyAnalyticsResponse(BaseModel):
    total_listings_crawled: int
    allowed_count: int
    review_count: int
    blocked_count: int
    takedown_enforced_count: int
    dead_batch_reentry_intercepts: int
    decision_distribution: List[Dict[str, Any]]
    platform_breakdown: List[Dict[str, Any]]


class ComplianceAnalyticsResponse(BaseModel):
    overall_compliance_score: float
    indices: List[Dict[str, Any]]
    historical_scores: List[Dict[str, Any]]


class GeospatialNodeResponse(BaseModel):
    node_id: str
    label: str
    type: str
    lat: float
    lng: float
    city: str
    active_batches: int
    status: str
    location_type: str


class ReportResponse(BaseModel):
    report_id: str
    report_title: str
    generated_at: str
    generated_by: str
    classification: str
    regulatory_notice: str
    batch_summary: Optional[Dict[str, Any]] = None
    timeline: List[Dict[str, Any]] = []
    evidence_count: int
    evidence_items: List[Dict[str, Any]] = []
    alerts_raised: int
    ai_risk_score: float
    ai_risk_level: str
    deterministic_shield_active: bool
    recommendation: str
