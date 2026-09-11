"""
Analytics API Endpoints — Phase 11: Advanced Evidence + Analytics.
"""
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.services.analytics_service import analytics_service
from backend.app.schemas.analytics import (
    AnalyticsOverviewResponse, ReverseLogisticsAnalyticsResponse,
    DisposalAnalyticsResponse, DestructionAnalyticsResponse,
    OnlineSafetyAnalyticsResponse, ComplianceAnalyticsResponse,
    GeospatialNodeResponse
)

router = APIRouter()


@router.get("/overview", response_model=AnalyticsOverviewResponse)
def get_analytics_overview(db: Session = Depends(get_db)):
    """Executive KPI overview across the entire platform."""
    return analytics_service.get_overview(db)


@router.get("/forward-supply")
def get_forward_supply_analytics(db: Session = Depends(get_db)):
    """Forward supply chain transfers, confirmed rates, and stage distribution."""
    return analytics_service.get_forward_supply_analytics(db)


@router.get("/reverse-logistics", response_model=ReverseLogisticsAnalyticsResponse)
def get_reverse_logistics_analytics(db: Session = Depends(get_db)):
    """Reverse chain volume, return discrepancies, transit days, and reason breakdown."""
    return analytics_service.get_reverse_logistics_analytics(db)


@router.get("/disposal", response_model=DisposalAnalyticsResponse)
@router.get("/disposal-throughput", response_model=DisposalAnalyticsResponse)
def get_disposal_analytics(db: Session = Depends(get_db)):
    """Disposal throughput, methods breakdown, and facility workload."""
    return analytics_service.get_disposal_analytics(db)


@router.get("/destruction", response_model=DestructionAnalyticsResponse)
def get_destruction_analytics(db: Session = Depends(get_db)):
    """Destruction certificates issued/verified and Dead Batch Registry closures."""
    return analytics_service.get_destruction_analytics(db)


@router.get("/online-safety", response_model=OnlineSafetyAnalyticsResponse)
@router.get("/online-marketplace", response_model=OnlineSafetyAnalyticsResponse)
def get_online_safety_analytics(db: Session = Depends(get_db)):
    """Marketplace listings surveillance, decisions, and takedown stats."""
    return analytics_service.get_online_safety_analytics(db)


@router.get("/ai-risk")
def get_ai_risk_analytics(db: Session = Depends(get_db)):
    """Fleet-wide AI risk score distribution and anomaly frequencies."""
    return analytics_service.get_ai_risk_analytics(db)


@router.get("/compliance", response_model=ComplianceAnalyticsResponse)
def get_compliance_analytics(db: Session = Depends(get_db)):
    """8-point regulatory compliance score and historical indices."""
    return analytics_service.get_compliance_analytics(db)


@router.get("/organizations", response_model=List[Dict[str, Any]])
def get_organization_comparison(db: Session = Depends(get_db)):
    """Comparative benchmarking across verified supply-chain participants."""
    return analytics_service.get_organization_comparison(db)


@router.get("/geospatial", response_model=List[GeospatialNodeResponse])
@router.get("/geospatial-telemetry", response_model=List[GeospatialNodeResponse])
def get_geospatial_telemetry(db: Session = Depends(get_db)):
    """Recorded location telemetry across supply chain facilities and nodes."""
    return analytics_service.get_geospatial_telemetry(db)
