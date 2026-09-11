"""
Reports API Endpoints — Phase 11: Advanced Evidence + Analytics.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.app.core.security import get_current_user_payload
from backend.app.db.session import get_db
from backend.app.services.report_service import report_service
from backend.app.schemas.analytics import ReportResponse

router = APIRouter()


@router.post("/batch/{batch_id_or_number}", response_model=ReportResponse)
@router.get("/batch/{batch_id_or_number}", response_model=ReportResponse)
def generate_batch_report(
    batch_id_or_number: str,
    inspector_name: str = Query("Senior Regulatory Inspector"),
    db: Session = Depends(get_db)
):
    """
    Generate or export a forensic batch investigation dossier
    containing full 10-phase chronological provenance and evidentiary SHA-256 links.
    """
    report = report_service.generate_batch_investigation_report(
        batch_id=batch_id_or_number,
        db=db,
        generated_by=inspector_name
    )

    if "error" in report:
        raise HTTPException(status_code=404, detail=report["error"])

    return report
