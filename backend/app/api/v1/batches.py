import uuid
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from backend.app.core.security import RoleChecker, get_current_user_payload
from backend.app.db.session import get_db
from backend.app.models.batch import Batch, BatchStatusEnum
from backend.app.models.medicine import Medicine
from backend.app.models.custody import CustodyTransfer
from backend.app.models.destruction import DestructionRecord
from backend.app.models.dead_batch import DeadBatch
from backend.app.models.intelligence import RiskScoreLog
from backend.app.models.audit import AuditLog
from backend.app.models.inventory import Inventory
from backend.app.models.sale import Sale
from backend.app.models.verification import VerificationScan, VerificationStatusEnum
from backend.app.schemas.batch import (
    BatchCreate, BatchResponse, BatchPassportResponse,
    BatchRecallRequest, BatchUpdateStatus, CustodyTransferCreate, CustodyTransferResponse,
    MedicineResponse, BatchEventResponse
)

router = APIRouter()

@router.post("", response_model=BatchResponse, status_code=status.HTTP_201_CREATED)
def create_batch(
    batch_in: BatchCreate,
    user_payload: dict = Depends(RoleChecker(["MANUFACTURER", "ADMIN"])),
    db: Session = Depends(get_db)
):
    # Validation 1: Expiry must be after manufacturing date
    if batch_in.expiry_date <= batch_in.mfg_date:
        raise HTTPException(status_code=400, detail="Expiry date must be after manufacturing date")

    # Validation 2: Quantity must be positive
    if batch_in.initial_quantity <= 0:
        raise HTTPException(status_code=400, detail="Manufactured quantity must be greater than zero")

    # Validation 3: Verify medicine exists
    medicine = db.query(Medicine).filter(Medicine.id == batch_in.medicine_id).first()
    if not medicine:
        raise HTTPException(status_code=404, detail="Medicine not found")

    # Validation 4: Check for duplicate batch number
    existing_batch = db.query(Batch).filter(Batch.batch_number == batch_in.batch_number).first()
    if existing_batch:
        raise HTTPException(status_code=400, detail=f"Batch number '{batch_in.batch_number}' already exists in National PharmaSafe Ledger. Please use a unique batch number.")

    # Validation 5: Manufacturer organization match
    user_role = user_payload.get("role")
    user_org_id = user_payload.get("org_id")
    if user_role == "MANUFACTURER":
        if not user_org_id:
            raise HTTPException(status_code=403, detail="Manufacturer user has no associated organization")
        org_id = user_org_id
    else:
        org_id = user_org_id or medicine.manufacturer_id or "org_pfizer_india"

    try:
        batch_id = f"btc_{uuid.uuid4().hex[:12]}"
        gtin = batch_in.gtin_barcode or f"0890{uuid.uuid4().int % 10000000000:010d}"
        
        new_batch = Batch(
            id=batch_id,
            batch_number=batch_in.batch_number,
            gtin_barcode=gtin,
            medicine_id=batch_in.medicine_id,
            manufacturer_id=org_id,
            mfg_date=batch_in.mfg_date,
            expiry_date=batch_in.expiry_date,
            initial_quantity=batch_in.initial_quantity,
            current_quantity=batch_in.initial_quantity,
            unit=batch_in.unit,
            status=BatchStatusEnum.MANUFACTURED,
            current_custodian_id=org_id,
            qr_payload=batch_in.qr_payload or f"PHARMASAFE:{batch_in.batch_number}:{gtin}"
        )
        db.add(new_batch)

        # Auto-create initial inventory for the manufacturer organization
        initial_inventory = Inventory(
            id=f"inv_{uuid.uuid4().hex[:12]}",
            organization_id=org_id,
            batch_id=batch_id,
            quantity_received=batch_in.initial_quantity,
            quantity_available=batch_in.initial_quantity,
            quantity_quarantined=0
        )
        db.add(initial_inventory)
        
        # Audit log
        audit = AuditLog(
            id=f"aud_{uuid.uuid4().hex[:12]}",
            action="BATCH_CREATED",
            entity_type="BATCH",
            entity_id=batch_id,
            actor_user_id=user_payload.get("sub"),
            actor_role=user_payload.get("role"),
            details=f"Batch {batch_in.batch_number} manufactured ({batch_in.initial_quantity} units) under organization {org_id}."
        )
        db.add(audit)
        db.commit()
        db.refresh(new_batch)
        return new_batch
    except Exception as e:
        import traceback
        error_msg = traceback.format_exc()
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}\n\n{error_msg}")

@router.get("", response_model=List[BatchResponse])
def list_batches(
    status: Optional[BatchStatusEnum] = None,
    medicine_id: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(50, le=100),
    offset: int = 0,
    db: Session = Depends(get_db)
):
    query = db.query(Batch)
    if status:
        query = query.filter(Batch.status == status)
    if medicine_id:
        query = query.filter(Batch.medicine_id == medicine_id)
    if search:
        search_term = f"%{search.strip()}%"
        query = query.join(Medicine, Batch.medicine_id == Medicine.id, isouter=True).filter(
            (Batch.batch_number.ilike(search_term)) |
            (Batch.gtin_barcode.ilike(search_term)) |
            (Medicine.brand_name.ilike(search_term)) |
            (Medicine.generic_name.ilike(search_term))
        )
    return query.order_by(Batch.created_at.desc()).offset(offset).limit(limit).all()

@router.get("/{batch_id_or_number}", response_model=BatchResponse)
def get_batch(
    batch_id_or_number: str,
    db: Session = Depends(get_db)
):
    batch = db.query(Batch).filter(
        (Batch.id == batch_id_or_number) | (Batch.batch_number == batch_id_or_number)
    ).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    return batch

@router.get("/{batch_id_or_number}/passport", response_model=BatchPassportResponse)
def get_batch_passport(
    batch_id_or_number: str,
    db: Session = Depends(get_db)
):
    batch = db.query(Batch).filter(
        (Batch.id == batch_id_or_number) | (Batch.batch_number == batch_id_or_number)
    ).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    medicine = batch.medicine
    manufacturer_name = batch.manufacturer_org.name if batch.manufacturer_org else "Unknown"
    current_custodian_name = batch.current_custodian.name if batch.current_custodian else None
    
    dead_entry = db.query(DeadBatch).filter(DeadBatch.batch_id == batch.id).first()
    destruction_rec = db.query(DestructionRecord).filter(DestructionRecord.batch_id == batch.id).first()
    latest_risk = db.query(RiskScoreLog).filter(RiskScoreLog.batch_id == batch.id).order_by(RiskScoreLog.timestamp.desc()).first()

    return BatchPassportResponse(
        batch_id=batch.id,
        batch_number=batch.batch_number,
        gtin_barcode=batch.gtin_barcode,
        status=batch.status,
        medicine=MedicineResponse.model_validate(medicine),
        manufacturer_name=manufacturer_name,
        mfg_date=batch.mfg_date,
        expiry_date=batch.expiry_date,
        initial_quantity=batch.initial_quantity,
        current_quantity=batch.current_quantity,
        unit=batch.unit,
        current_custodian_name=current_custodian_name,
        is_recalled=batch.is_recalled,
        recall_reason=batch.recall_reason,
        is_dead_batch=dead_entry is not None,
        destruction_cert_hash=destruction_rec.certificate_sha256_hash if destruction_rec else None,
        custody_history=[CustodyTransferResponse.model_validate(c) for c in batch.custody_transfers],
        latest_risk_score=latest_risk.composite_risk_score if latest_risk else None,
        risk_level=latest_risk.risk_level.value if latest_risk else None,
        created_at=batch.created_at
    )

@router.get("/{batch_id_or_number}/events", response_model=List[BatchEventResponse])
def get_batch_events(
    batch_id_or_number: str,
    db: Session = Depends(get_db)
):
    batch = db.query(Batch).filter(
        (Batch.id == batch_id_or_number) | (Batch.batch_number == batch_id_or_number)
    ).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    events: List[BatchEventResponse] = []
    mfg_org_name = batch.manufacturer_org.name if batch.manufacturer_org else "Manufacturer"

    # 1. MANUFACTURED event
    events.append(
        BatchEventResponse(
            id=f"evt_mfg_{batch.id}",
            event_type="MANUFACTURED",
            timestamp=batch.created_at,
            actor="Manufacturer Quality Assurance",
            organization=mfg_org_name,
            quantity=batch.initial_quantity,
            location="Production Plant & Warehouse",
            previous_status=None,
            new_status="MANUFACTURED",
            details=f"Batch {batch.batch_number} manufactured ({batch.initial_quantity} {batch.unit.value}s). Issued GTIN {batch.gtin_barcode}."
        )
    )

    # 2. Custody transfers (distribution, transfer)
    # 2. Custody transfers (distribution, transfer, receiving)
    for t in batch.custody_transfers:
        from_org_name = t.from_organization.name if t.from_organization else "Sender"
        to_org_name = t.to_organization.name if t.to_organization else "Recipient"
        
        # 2a. Dispatch Outbound Event
        if t.stage.value == "MANUFACTURE_TO_DISTRIBUTOR":
            disp_stage = "MANUFACTURE_TO_DISTRIBUTOR"
            disp_title = f"Dispatched to Distributor ({to_org_name})"
            prev_stat = "MANUFACTURED"
            new_stat = "IN_DISTRIBUTION"
        else:
            disp_stage = "DISTRIBUTOR_TO_PHARMACY"
            disp_title = f"Dispatched to Pharmacy ({to_org_name})"
            prev_stat = "IN_DISTRIBUTION"
            new_stat = "AT_PHARMACY"

        events.append(
            BatchEventResponse(
                id=f"evt_trn_disp_{t.id}",
                event_type=disp_stage,
                timestamp=t.timestamp,
                actor=t.from_actor.full_name if t.from_actor else "Logistics Dispatcher",
                organization=f"{from_org_name} -> {to_org_name}",
                quantity=t.transferred_quantity,
                location=t.location_name or "Shipping Bay",
                previous_status=prev_stat,
                new_status=new_stat,
                details=f"Outbound transfer initiated ({t.transferred_quantity} units)."
            )
        )

        # 2b. Receiving Inbound Confirmation Event
        if t.is_confirmed:
            recv_stage = "DISTRIBUTOR_RECEIVED" if t.stage.value == "MANUFACTURE_TO_DISTRIBUTOR" else "PHARMACY_RECEIVED"
            recv_title = f"Wholesale Intake Reconciled: {to_org_name}" if t.stage.value == "MANUFACTURE_TO_DISTRIBUTOR" else f"Pharmacy Receiving Reconciled: {to_org_name}"
            recv_qty = t.verified_quantity if t.verified_quantity is not None else t.transferred_quantity
            recv_stat = "ALERT" if t.has_discrepancy else "COMPLETED"

            events.append(
                BatchEventResponse(
                    id=f"evt_trn_recv_{t.id}",
                    event_type=recv_stage,
                    timestamp=t.timestamp + timedelta(seconds=1),
                    actor=t.to_actor.full_name if t.to_actor else "Intake Inspector",
                    organization=to_org_name,
                    quantity=recv_qty,
                    location=t.location_name or "Receiving Inspection Dock",
                    previous_status=new_stat,
                    new_status=new_stat,
                    details=t.discrepancy_notes or f"Physical stock accepted into inventory ({recv_qty} units verified)."
                )
            )

    # 3. Return requests
    for r in batch.return_requests:
        init_org_name = r.initiator_org.name if r.initiator_org else "Initiating Facility"
        dest_org_name = r.destination_facility.name if r.destination_facility else "Disposal Site"
        events.append(
            BatchEventResponse(
                id=f"evt_ret_{r.id}",
                event_type="RETURN_INITIATED",
                timestamp=r.created_at,
                actor=r.initiator_user.full_name if r.initiator_user else "Facility Manager",
                organization=f"{init_org_name} -> {dest_org_name}",
                quantity=r.quantity,
                location="Reverse Logistics Transit",
                previous_status="AT_PHARMACY",
                new_status=r.status.value,
                details=f"Return manifest {r.tracking_code} initiated. Reason: {r.reason.value}. {r.notes or ''}"
            )
        )

    # 4. Destruction record
    if batch.destruction_record:
        d = batch.destruction_record
        facility_name = d.facility_org.name if d.facility_org else "Disposal Facility"
        events.append(
            BatchEventResponse(
                id=f"evt_dst_{d.id}",
                event_type="DESTROYED",
                timestamp=d.timestamp,
                actor=f"Witness: {d.witness_name} ({d.witness_badge_id})",
                organization=facility_name,
                quantity=d.quantity_destroyed,
                location="Destruction Facility",
                previous_status="RECEIVED_AT_DISPOSAL",
                new_status="DEAD_BATCH",
                details=f"Certified destruction via {d.destruction_method}. SHA-256 Hash: {d.certificate_sha256_hash[:16]}... Permanently inscribed in Dead Batch Registry."
            )
        )

    # 5. Recall event
    if batch.is_recalled:
        events.append(
            BatchEventResponse(
                id=f"evt_rec_{batch.id}",
                event_type="RECALLED",
                timestamp=batch.recall_date or batch.updated_at,
                actor="Safety Directorate",
                organization=mfg_org_name,
                quantity=batch.current_quantity,
                location="National Supply Alert",
                previous_status=batch.status.value,
                new_status="RECALLED",
                details=f"Mandatory safety recall issued. Reason: {batch.recall_reason or 'Safety inspection flag'}"
            )
        )

    # 6. Sales dispense events
    sales = db.query(Sale).filter(Sale.batch_id == batch.id, Sale.sale_allowed == True).all()
    for s in sales:
        seller_name = s.seller_org.name if s.seller_org else "Pharmacy"
        events.append(
            BatchEventResponse(
                id=f"evt_sal_{s.id}",
                event_type="DISPENSED",
                timestamp=s.timestamp,
                actor=s.sold_by_user.full_name if s.sold_by_user else "Pharmacist",
                organization=seller_name,
                quantity=s.quantity_sold,
                location="Retail Dispense Counter",
                previous_status="AT_PHARMACY",
                new_status="AT_PHARMACY",
                details=f"Dispensed {s.quantity_sold} units to patient (Ref: {s.customer_reference or 'Prescription'})."
            )
        )

    # 7. Verification re-entry scans
    scans = db.query(VerificationScan).filter(
        (VerificationScan.batch_id == batch.id) | (VerificationScan.batch_number == batch.batch_number),
        VerificationScan.verification_status == VerificationStatusEnum.DEAD_BATCH_REENTRY_DETECTED
    ).all()
    for sc in scans:
        events.append(
            BatchEventResponse(
                id=f"evt_scn_{sc.id}",
                event_type="REENTRY_FLAGGED",
                timestamp=sc.timestamp,
                actor="Automated Sentinel",
                organization="National Sentinel",
                quantity=None,
                location=f"GPS: ({sc.latitude}, {sc.longitude})" if sc.latitude else "Unknown Location",
                previous_status="DEAD_BATCH",
                new_status="DEAD_BATCH",
                details=f"CRITICAL: Re-entry attempt blocked. {sc.alert_details or 'Scan attempt of blacklisted dead batch.'}"
            )
        )

    # Sort events chronologically
    events.sort(key=lambda e: e.timestamp)
    return events


@router.post("/{batch_id}/recall", response_model=BatchResponse)
def recall_batch(
    batch_id: str,
    recall_in: BatchRecallRequest,
    user_payload: dict = Depends(RoleChecker(["MANUFACTURER", "REGULATOR_AUDITOR", "ADMIN"])),
    db: Session = Depends(get_db)
):
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    batch.is_recalled = True
    batch.recall_reason = recall_in.recall_reason
    batch.recall_date = datetime.now(timezone.utc)
    batch.status = BatchStatusEnum.RECALLED
    
    audit = AuditLog(
        id=f"aud_{uuid.uuid4().hex[:12]}",
        action="BATCH_RECALLED",
        entity_type="BATCH",
        entity_id=batch.id,
        actor_user_id=user_payload.get("sub"),
        actor_role=user_payload.get("role"),
        details=f"Batch {batch.batch_number} recalled. Reason: {recall_in.recall_reason}"
    )
    db.add(audit)
    db.commit()
    db.refresh(batch)
    return batch

@router.post("/{batch_id}/custody-transfer", response_model=CustodyTransferResponse)
def record_custody_transfer(
    batch_id: str,
    transfer_in: CustodyTransferCreate,
    user_payload: dict = Depends(get_current_user_payload),
    db: Session = Depends(get_db)
):
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    from_org_id = user_payload.get("org_id") or batch.current_custodian_id
    transfer_id = f"trn_{uuid.uuid4().hex[:12]}"
    
    has_discrepancy = False
    discrepancy_notes = None
    if transfer_in.verified_quantity is not None and transfer_in.verified_quantity < transfer_in.transferred_quantity:
        has_discrepancy = True
        discrepancy_notes = f"Quantity mismatch: {transfer_in.transferred_quantity} sent, {transfer_in.verified_quantity} verified."
        batch.current_quantity = transfer_in.verified_quantity
    else:
        batch.current_quantity = transfer_in.transferred_quantity

    new_transfer = CustodyTransfer(
        id=transfer_id,
        batch_id=batch.id,
        stage=transfer_in.stage,
        from_organization_id=from_org_id,
        to_organization_id=transfer_in.to_organization_id,
        transferred_quantity=transfer_in.transferred_quantity,
        verified_quantity=transfer_in.verified_quantity,
        has_discrepancy=has_discrepancy,
        discrepancy_notes=discrepancy_notes,
        from_actor_user_id=user_payload.get("sub"),
        latitude=transfer_in.latitude,
        longitude=transfer_in.longitude,
        location_name=transfer_in.location_name,
        digital_signature=transfer_in.digital_signature
    )
    
    # Update custodian
    batch.current_custodian_id = transfer_in.to_organization_id
    if transfer_in.stage.value == "DISTRIBUTOR_TO_PHARMACY":
        batch.status = BatchStatusEnum.AT_PHARMACY
    elif transfer_in.stage.value == "MANUFACTURE_TO_DISTRIBUTOR":
        batch.status = BatchStatusEnum.IN_DISTRIBUTION

    db.add(new_transfer)
    db.commit()
    db.refresh(new_transfer)
    return new_transfer
