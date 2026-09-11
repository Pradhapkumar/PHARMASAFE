from typing import List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from backend.app.core.security import RoleChecker
from backend.app.db.session import get_db
from backend.app.models.batch import Batch, BatchStatusEnum
from backend.app.models.reverse_logistics import ReturnRequest, ReturnStatusEnum
from backend.app.models.dead_batch import DeadBatch
from backend.app.models.verification import VerificationScan, VerificationStatusEnum
from backend.app.models.audit import AuditLog
from backend.app.schemas.audit import AuditLogResponse, ComplianceReportResponse

router = APIRouter()

@router.get("/logs", response_model=List[AuditLogResponse])
def get_audit_logs(
    limit: int = Query(50, le=100),
    offset: int = 0,
    user_payload: dict = Depends(RoleChecker(["ADMIN", "REGULATOR_AUDITOR", "MANUFACTURER"])),
    db: Session = Depends(get_db)
):
    return db.query(AuditLog).order_by(AuditLog.timestamp.desc()).offset(offset).limit(limit).all()

@router.get("/compliance/summary", response_model=ComplianceReportResponse)
def get_compliance_summary(db: Session = Depends(get_db)):
    total_active = db.query(Batch).filter(Batch.status.in_([BatchStatusEnum.MANUFACTURED, BatchStatusEnum.IN_DISTRIBUTION, BatchStatusEnum.AT_PHARMACY])).count()
    total_expired = db.query(Batch).filter(Batch.status == BatchStatusEnum.EXPIRED).count()
    total_recalled = db.query(Batch).filter(Batch.is_recalled == True).count()
    total_in_transit_returns = db.query(ReturnRequest).filter(ReturnRequest.status.in_([ReturnStatusEnum.INITIATED, ReturnStatusEnum.IN_TRANSIT])).count()
    total_dead_batches = db.query(DeadBatch).count()
    
    # Total re-entry violations intercepted
    reentry_scans = db.query(VerificationScan).filter(VerificationScan.verification_status == VerificationStatusEnum.DEAD_BATCH_REENTRY_DETECTED).count()

    # Calculate overall integrity score (0.0 to 100.0%)
    integrity = 98.6
    if reentry_scans > 0:
        integrity = max(70.0, round(98.6 - (reentry_scans * 2.5), 1))

    return ComplianceReportResponse(
        total_active_batches=total_active,
        total_expired_batches=total_expired,
        total_recalled_batches=total_recalled,
        total_returns_in_transit=total_in_transit_returns,
        total_destroyed_dead_batches=total_dead_batches,
        total_reentry_violations_prevented=reentry_scans,
        overall_system_integrity_score=integrity
    )
