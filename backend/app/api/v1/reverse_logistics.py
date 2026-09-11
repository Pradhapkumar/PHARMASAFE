import hashlib
import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from backend.app.core.security import get_current_user_payload, RoleChecker
from backend.app.core.config import settings
from backend.app.db.session import get_db
from backend.app.models.batch import Batch, BatchStatusEnum
from backend.app.models.reverse_logistics import ReturnRequest, ReturnStatusEnum
from backend.app.models.custody import CustodyTransfer, TransferStageEnum
from backend.app.models.audit import AuditLog
from backend.app.models.alert import AlertType, AlertSeverity
from backend.app.services.alert_service import create_alert
from backend.app.schemas.reverse_logistics import (
    ReturnRequestCreate, ReturnStatusUpdate, ReturnRouteToDisposalRequest, ReturnRequestResponse
)
from pydantic import BaseModel

router = APIRouter()


class QuantityVerificationRequest(BaseModel):
    received_quantity: int
    notes: Optional[str] = None


@router.post("", response_model=ReturnRequestResponse, status_code=status.HTTP_201_CREATED)
def create_return_request(
    return_in: ReturnRequestCreate,
    user_payload: dict = Depends(RoleChecker(["PHARMACY", "DISTRIBUTOR", "ADMIN", "MANUFACTURER", "REGULATOR", "DISPOSAL_FACILITY"])),
    db: Session = Depends(get_db)
):
    # Resolve batch by batch_id or batch_number
    batch = None
    if return_in.batch_id:
        batch = db.query(Batch).filter(Batch.id == return_in.batch_id).first()
    if not batch and return_in.batch_number:
        batch = db.query(Batch).filter(Batch.batch_number == return_in.batch_number).first()
    if not batch and return_in.batch_id:
        batch = db.query(Batch).filter(Batch.batch_number == return_in.batch_id).first()

    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    if return_in.quantity > batch.current_quantity and batch.current_quantity > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Return quantity ({return_in.quantity}) exceeds batch current quantity ({batch.current_quantity})"
        )

    org_id = user_payload.get("org_id")
    if not org_id:
        raise HTTPException(status_code=400, detail="User is not associated with an organization")

    now = datetime.now(timezone.utc)
    return_id = f"ret_{uuid.uuid4().hex[:12]}"
    tracking_code = f"TRK-REV-{now.strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"

    # Calculate SHA-256 Return Manifest Hash
    manifest_payload = f"MANIFEST:{batch.batch_number}:{return_in.quantity}:{return_in.reason.value}:{now.isoformat()}"
    manifest_hash = hashlib.sha256(manifest_payload.encode()).hexdigest()

    new_return = ReturnRequest(
        id=return_id,
        batch_id=batch.id,
        initiator_org_id=org_id,
        initiator_user_id=user_payload.get("sub"),
        destination_facility_id=return_in.destination_facility_id,
        quantity=return_in.quantity,
        reason=return_in.reason,
        status=ReturnStatusEnum.INITIATED,
        tracking_code=tracking_code,
        manifest_hash=manifest_hash,
        carrier_name=return_in.carrier_name or "PharmaSafe Logistics Carrier",
        carrier_tracking_ref=return_in.carrier_tracking_ref or f"REF-{uuid.uuid4().hex[:8].upper()}",
        driver_badge=return_in.driver_badge or f"BDG-{uuid.uuid4().hex[:4].upper()}",
        notes=return_in.notes
    )

    # Transition batch state to RETURN_INITIATED
    batch.status = BatchStatusEnum.RETURN_INITIATED

    # Create Custody Transfer Record for Reverse Logistics Handover
    custody_id = f"cst_{uuid.uuid4().hex[:12]}"
    custody = CustodyTransfer(
        id=custody_id,
        batch_id=batch.id,
        stage=TransferStageEnum.PHARMACY_TO_REVERSE_CARRIER,
        from_organization_id=org_id,
        to_organization_id=return_in.destination_facility_id,
        transferred_quantity=return_in.quantity,
        from_actor_user_id=user_payload.get("sub"),
        digital_signature=f"SIG-REV-MANIFEST-{manifest_hash[:16]}",
        is_confirmed=True
    )

    audit = AuditLog(
        id=f"aud_{uuid.uuid4().hex[:12]}",
        action="RETURN_INITIATED",
        entity_type="RETURN",
        entity_id=return_id,
        actor_user_id=user_payload.get("sub"),
        actor_role=user_payload.get("role"),
        details=f"Reverse return initiated for batch {batch.batch_number} ({return_in.quantity} units, Reason: {return_in.reason.value}). Manifest Hash: {manifest_hash}."
    )

    db.add(new_return)
    db.add(custody)
    db.add(audit)
    db.commit()
    db.refresh(new_return)
    return new_return


@router.get("", response_model=List[ReturnRequestResponse])
def list_return_requests(
    status: Optional[ReturnStatusEnum] = None,
    batch_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(ReturnRequest)
    if status:
        query = query.filter(ReturnRequest.status == status)
    if batch_id:
        query = query.filter(ReturnRequest.batch_id == batch_id)
    return query.order_by(ReturnRequest.created_at.desc()).all()


@router.get("/{return_id}", response_model=ReturnRequestResponse)
def get_return_request(return_id: str, db: Session = Depends(get_db)):
    return_req = db.query(ReturnRequest).filter(ReturnRequest.id == return_id).first()
    if not return_req:
        raise HTTPException(status_code=404, detail="Return request not found")
    return return_req


@router.patch("/{return_id}/status", response_model=ReturnRequestResponse)
def update_return_status(
    return_id: str,
    status_update: ReturnStatusUpdate,
    user_payload: dict = Depends(RoleChecker(["PHARMACY", "DISTRIBUTOR", "DISPOSAL_FACILITY", "ADMIN", "MANUFACTURER", "REGULATOR"])),
    db: Session = Depends(get_db)
):
    return_req = db.query(ReturnRequest).filter(ReturnRequest.id == return_id).first()
    if not return_req:
        raise HTTPException(status_code=404, detail="Return request not found")

    # Block Phase 8 states from Phase 7 return status updates
    if str(status_update.status) in ("COMPLETED_DESTROYED", "DEAD_BATCH", "DESTROYED"):
        raise HTTPException(
            status_code=400,
            detail="Invalid Phase 7 status transition. Phase 7 returns end at DISPOSED. Final destruction certification belongs to Phase 8."
        )

    return_req.status = status_update.status

    if status_update.manifest_hash:
        return_req.manifest_hash = status_update.manifest_hash
    if status_update.carrier_name:
        return_req.carrier_name = status_update.carrier_name
    if status_update.carrier_tracking_ref:
        return_req.carrier_tracking_ref = status_update.carrier_tracking_ref
    if status_update.driver_badge:
        return_req.driver_badge = status_update.driver_badge
    if status_update.scale_weight_kg:
        return_req.scale_weight_kg = status_update.scale_weight_kg
    if status_update.received_quantity is not None:
        return_req.received_quantity = status_update.received_quantity

    if status_update.notes:
        return_req.notes = (return_req.notes or "") + f"\n[{datetime.now(timezone.utc).isoformat()}] {status_update.notes}"

    # Sync batch status
    batch = return_req.batch
    if status_update.status in (ReturnStatusEnum.IN_TRANSIT, ReturnStatusEnum.PICKUP_COMPLETED, ReturnStatusEnum.PICKED_UP):
        batch.status = BatchStatusEnum.RETURN_IN_TRANSIT
    elif status_update.status in (ReturnStatusEnum.RECEIVED_AT_DISPOSAL, ReturnStatusEnum.RECEIVED_AT_FACILITY, ReturnStatusEnum.RECEIVED, ReturnStatusEnum.RECONCILED, ReturnStatusEnum.VERIFIED, ReturnStatusEnum.AWAITING_DISPOSAL):
        batch.status = BatchStatusEnum.RECEIVED_AT_DISPOSAL
        batch.current_custodian_id = return_req.destination_facility_id
    elif status_update.status == ReturnStatusEnum.DISPOSED:
        batch.status = BatchStatusEnum.DISPOSED

        # --- Quantity Reconciliation ---
        rec_qty = status_update.received_quantity if status_update.received_quantity is not None else return_req.received_quantity
        if rec_qty is not None:
            expected = return_req.quantity
            received = rec_qty
            discrepancy = received - expected

            notes_line = f"Qty reconciliation: expected={expected}, received={received}, discrepancy={discrepancy}."
            if notes_line not in (return_req.notes or ""):
                return_req.notes = (return_req.notes or "") + f"\n[{datetime.now(timezone.utc).isoformat()}] {notes_line}"

            if abs(discrepancy) > settings.QUANTITY_DISCREPANCY_TOLERANCE:
                create_alert(
                    db,
                    alert_type=AlertType.QUANTITY_DISCREPANCY,
                    severity=AlertSeverity.HIGH,
                    title=f"Quantity Discrepancy: Return {return_req.tracking_code}",
                    message=(
                        f"Return {return_req.tracking_code} for batch {batch.batch_number}: "
                        f"Expected {expected} units, received {received}. "
                        f"Discrepancy: {discrepancy:+d} units (tolerance: ±{settings.QUANTITY_DISCREPANCY_TOLERANCE})."
                    ),
                    entity_type="RETURN",
                    entity_id=return_req.id,
                )

        # Log custody transfer to receiving facility
        custody_id = f"cst_{uuid.uuid4().hex[:12]}"
        custody = CustodyTransfer(
            id=custody_id,
            batch_id=batch.id,
            stage=TransferStageEnum.REVERSE_CARRIER_TO_DISPOSAL,
            from_organization_id=return_req.initiator_org_id,
            to_organization_id=return_req.destination_facility_id,
            transferred_quantity=return_req.quantity,
            verified_quantity=rec_qty,
            has_discrepancy=abs(rec_qty - return_req.quantity) > settings.QUANTITY_DISCREPANCY_TOLERANCE if rec_qty is not None else False,
            to_actor_user_id=user_payload.get("sub"),
            is_confirmed=True
        )
        db.add(custody)

    audit = AuditLog(
        id=f"aud_{uuid.uuid4().hex[:12]}",
        action="RETURN_STATUS_UPDATED",
        entity_type="RETURN",
        entity_id=return_req.id,
        actor_user_id=user_payload.get("sub"),
        actor_role=user_payload.get("role"),
        details=f"Return {return_req.tracking_code} transitioned to {status_update.status.value}."
    )
    db.add(audit)
    db.commit()
    db.refresh(return_req)
    return return_req


@router.post("/{return_id}/route-to-disposal", response_model=ReturnRequestResponse)
def route_return_to_disposal(
    return_id: str,
    route_in: ReturnRouteToDisposalRequest,
    user_payload: dict = Depends(RoleChecker(["DISTRIBUTOR", "PHARMACY", "DISPOSAL_FACILITY", "ADMIN", "MANUFACTURER", "REGULATOR"])),
    db: Session = Depends(get_db)
):
    return_req = db.query(ReturnRequest).filter(ReturnRequest.id == return_id).first()
    if not return_req:
        raise HTTPException(status_code=404, detail="Return request not found")

    old_facility_id = return_req.destination_facility_id
    return_req.destination_facility_id = route_in.disposal_facility_id
    return_req.status = ReturnStatusEnum.ROUTED_TO_DISPOSAL

    if route_in.carrier_name:
        return_req.carrier_name = route_in.carrier_name
    if route_in.carrier_tracking_ref:
        return_req.carrier_tracking_ref = route_in.carrier_tracking_ref
    if route_in.driver_badge:
        return_req.driver_badge = route_in.driver_badge
    if route_in.notes:
        return_req.notes = (return_req.notes or "") + f"\n[{datetime.now(timezone.utc).isoformat()}] Routed to Disposal Plant {route_in.disposal_facility_id}. {route_in.notes}"

    batch = return_req.batch
    batch.status = BatchStatusEnum.RETURN_IN_TRANSIT

    # Log Custody Transfer for Routing to Disposal Plant
    custody_id = f"cst_{uuid.uuid4().hex[:12]}"
    custody = CustodyTransfer(
        id=custody_id,
        batch_id=batch.id,
        stage=TransferStageEnum.REVERSE_CARRIER_TO_DISPOSAL,
        from_organization_id=old_facility_id,
        to_organization_id=route_in.disposal_facility_id,
        transferred_quantity=return_req.quantity,
        from_actor_user_id=user_payload.get("sub"),
        is_confirmed=True
    )

    audit = AuditLog(
        id=f"aud_{uuid.uuid4().hex[:12]}",
        action="RETURN_ROUTED_TO_DISPOSAL",
        entity_type="RETURN",
        entity_id=return_req.id,
        actor_user_id=user_payload.get("sub"),
        actor_role=user_payload.get("role"),
        details=f"Return {return_req.tracking_code} for batch {batch.batch_number} routed to disposal facility {route_in.disposal_facility_id}."
    )

    db.add(custody)
    db.add(audit)
    db.commit()
    db.refresh(return_req)
    return return_req
