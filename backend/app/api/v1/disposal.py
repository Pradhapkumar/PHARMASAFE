import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.core.security import RoleChecker
from backend.app.db.session import get_db
from backend.app.models.batch import Batch, BatchStatusEnum
from backend.app.models.reverse_logistics import ReturnRequest, ReturnStatusEnum
from backend.app.models.disposal import DisposalRecord
from backend.app.models.custody import CustodyTransfer, TransferStageEnum
from backend.app.models.audit import AuditLog
from backend.app.schemas.disposal import (
    DisposalIntakeCreate, DisposalCompletionRequest, DisposalRecordResponse
)

router = APIRouter()


@router.post("/intake", response_model=DisposalRecordResponse, status_code=status.HTTP_201_CREATED)
def record_disposal_intake(
    record_in: DisposalIntakeCreate,
    user_payload: dict = Depends(RoleChecker(["DISPOSAL_FACILITY", "ADMIN"])),
    db: Session = Depends(get_db)
):
    batch = None
    if record_in.batch_id:
        batch = db.query(Batch).filter(Batch.id == record_in.batch_id).first()
    if not batch and record_in.batch_number:
        batch = db.query(Batch).filter(Batch.batch_number == record_in.batch_number).first()
    if not batch and record_in.batch_id:
        batch = db.query(Batch).filter(Batch.batch_number == record_in.batch_id).first()

    return_req = None
    if record_in.return_id:
        return_req = db.query(ReturnRequest).filter(ReturnRequest.id == record_in.return_id).first()
        if return_req and not batch:
            batch = return_req.batch

    if not batch:
        # Check active return requests if batch not passed directly
        active_return = db.query(ReturnRequest).order_by(ReturnRequest.created_at.desc()).first()
        if active_return:
            batch = active_return.batch
            return_req = active_return

    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    org_id = user_payload.get("org_id") or "org_green_shield_disposal"
    now = datetime.now(timezone.utc)
    dsp_id = f"dsp_{uuid.uuid4().hex[:12]}"

    disposal_rec = DisposalRecord(
        id=dsp_id,
        return_id=return_req.id if return_req else None,
        batch_id=batch.id,
        facility_org_id=org_id,
        operator_user_id=user_payload.get("sub"),
        disposed_quantity=record_in.disposed_quantity,
        disposal_method=record_in.disposal_method,
        scale_weight_kg=record_in.scale_weight_kg or "45.0",
        evidence_media_url=record_in.evidence_media_url,
        status="DISPOSAL_IN_PROGRESS",
        notes=record_in.notes or "Operational disposal intake verified at bio-hazard facility.",
        timestamp=now
    )

    if return_req:
        return_req.status = ReturnStatusEnum.DISPOSAL_IN_PROGRESS

    audit = AuditLog(
        id=f"aud_{uuid.uuid4().hex[:12]}",
        action="DISPOSAL_INTAKE_RECORDED",
        entity_type="DISPOSAL",
        entity_id=dsp_id,
        actor_user_id=user_payload.get("sub"),
        actor_role=user_payload.get("role"),
        details=f"Operational disposal intake recorded for batch {batch.batch_number} ({record_in.disposed_quantity} units, Method: {record_in.disposal_method}). Status: DISPOSAL_IN_PROGRESS."
    )

    db.add(disposal_rec)
    db.add(audit)
    db.commit()
    db.refresh(disposal_rec)
    return disposal_rec


@router.post("/{disposal_id}/complete", response_model=DisposalRecordResponse)
def complete_disposal(
    disposal_id: str,
    completion_in: Optional[DisposalCompletionRequest] = None,
    user_payload: dict = Depends(RoleChecker(["DISPOSAL_FACILITY", "ADMIN"])),
    db: Session = Depends(get_db)
):
    disposal_rec = db.query(DisposalRecord).filter(DisposalRecord.id == disposal_id).first()
    if not disposal_rec:
        # Check by batch_id or return_id
        disposal_rec = db.query(DisposalRecord).filter(
            (DisposalRecord.batch_id == disposal_id) | (DisposalRecord.return_id == disposal_id)
        ).first()

    if not disposal_rec:
        raise HTTPException(status_code=404, detail="Disposal record not found")

    disposal_rec.status = "DISPOSED"
    now = datetime.now(timezone.utc)

    if completion_in:
        if completion_in.notes:
            disposal_rec.notes = (disposal_rec.notes or "") + f"\n[{now.isoformat()}] {completion_in.notes}"
        if completion_in.evidence_media_url:
            disposal_rec.evidence_media_url = completion_in.evidence_media_url

    # Transition return status and batch status to DISPOSED
    if disposal_rec.return_id:
        return_req = db.query(ReturnRequest).filter(ReturnRequest.id == disposal_rec.return_id).first()
        if return_req:
            return_req.status = ReturnStatusEnum.DISPOSED

    batch = disposal_rec.batch
    if batch:
        batch.status = BatchStatusEnum.DISPOSED

    # Log Custody / Transfer event for disposal completion
    custody_id = f"cst_{uuid.uuid4().hex[:12]}"
    custody = CustodyTransfer(
        id=custody_id,
        batch_id=batch.id if batch else "unknown",
        stage=TransferStageEnum.DIRECT_TO_DISPOSAL,
        from_organization_id=disposal_rec.facility_org_id,
        to_organization_id=disposal_rec.facility_org_id,
        transferred_quantity=disposal_rec.disposed_quantity,
        verified_quantity=disposal_rec.disposed_quantity,
        from_actor_user_id=user_payload.get("sub"),
        is_confirmed=True
    )

    audit = AuditLog(
        id=f"aud_{uuid.uuid4().hex[:12]}",
        action="DISPOSAL_COMPLETED",
        entity_type="DISPOSAL",
        entity_id=disposal_rec.id,
        actor_user_id=user_payload.get("sub"),
        actor_role=user_payload.get("role"),
        details=f"Operational disposal completed for batch {batch.batch_number if batch else 'unknown'}. Final Phase 7 state: DISPOSED."
    )

    db.add(custody)
    db.add(audit)
    db.commit()
    db.refresh(disposal_rec)
    return disposal_rec


@router.get("/records", response_model=List[DisposalRecordResponse])
def list_disposal_records(db: Session = Depends(get_db)):
    return db.query(DisposalRecord).order_by(DisposalRecord.timestamp.desc()).all()
