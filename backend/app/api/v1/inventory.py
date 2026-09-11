import uuid
from typing import List, Optional
from datetime import datetime, timezone, date, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from pydantic import BaseModel, Field

from backend.app.core.security import get_current_user_payload
from backend.app.db.session import get_db
from backend.app.models.inventory import Inventory
from backend.app.models.batch import Batch, BatchStatusEnum
from backend.app.models.custody import CustodyTransfer, TransferStageEnum
from backend.app.models.user import Organization, RoleEnum
from backend.app.models.alert import Alert, AlertSeverity, AlertType
from backend.app.models.audit import AuditLog
from backend.app.services.alert_service import create_alert
from backend.app.services.inventory_service import (
    receive_inventory, transfer_inventory, InsufficientStockError, InventoryNotFoundError
)

router = APIRouter()


# --- Schemas ---
class InventoryReceiveRequest(BaseModel):
    batch_id: str
    organization_id: str
    quantity: int = Field(..., gt=0)


class InventoryTransferRequest(BaseModel):
    batch_id: str
    from_org_id: str
    to_org_id: str
    quantity: int = Field(..., gt=0)


class InventoryResponse(BaseModel):
    id: str
    organization_id: str
    batch_id: str
    batch_number: Optional[str] = None
    medicine_brand_name: Optional[str] = None
    medicine_generic_name: Optional[str] = None
    dosage_form: Optional[str] = None
    expiry_date: Optional[str] = None
    batch_status: Optional[str] = None
    quantity_received: int
    quantity_available: int
    quantity_quarantined: int
    updated_at: datetime

    class Config:
        from_attributes = True


class TransferDispatchRequest(BaseModel):
    batch_id: str
    to_organization_id: str
    quantity: int = Field(..., gt=0)
    notes: Optional[str] = None
    location_name: Optional[str] = None


class TransferReceiveRequest(BaseModel):
    verified_quantity: int = Field(..., ge=0)
    discrepancy_notes: Optional[str] = None
    location_name: Optional[str] = None


class TransferDetailResponse(BaseModel):
    id: str
    batch_id: str
    batch_number: str
    gtin_barcode: str
    medicine_brand_name: str
    medicine_generic_name: str
    dosage_form: Optional[str] = None
    stage: str
    from_organization_id: str
    from_organization_name: str
    to_organization_id: str
    to_organization_name: str
    transferred_quantity: int
    verified_quantity: Optional[int] = None
    has_discrepancy: bool
    discrepancy_notes: Optional[str] = None
    is_confirmed: bool
    location_name: Optional[str] = None
    expiry_date: str
    batch_status: str
    timestamp: datetime


@router.get("", response_model=List[InventoryResponse])
def list_inventory(
    organization_id: Optional[str] = None,
    batch_id: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    user_payload: dict = Depends(get_current_user_payload),
    db: Session = Depends(get_db),
):
    """List inventory records. Filter by organization, batch, status, or search query."""
    query = db.query(Inventory).join(Batch, Inventory.batch_id == Batch.id)

    if organization_id:
        query = query.filter(Inventory.organization_id == organization_id)
    elif user_payload.get("org_id"):
        query = query.filter(Inventory.organization_id == user_payload["org_id"])

    if batch_id:
        query = query.filter(Inventory.batch_id == batch_id)

    if status and status != "ALL":
        query = query.filter(Batch.status == status)

    if search:
        s = f"%{search.lower()}%"
        query = query.filter(
            or_(
                Batch.batch_number.ilike(s),
                Batch.gtin_barcode.ilike(s)
            )
        )

    records = query.all()
    results = []
    for inv in records:
        b = inv.batch
        med = b.medicine if b else None
        results.append(
            InventoryResponse(
                id=inv.id,
                organization_id=inv.organization_id,
                batch_id=inv.batch_id,
                batch_number=b.batch_number if b else None,
                medicine_brand_name=med.brand_name if med else None,
                medicine_generic_name=med.generic_name if med else None,
                dosage_form=med.dosage_form if med else None,
                expiry_date=b.expiry_date.isoformat() if b and b.expiry_date else None,
                batch_status=b.status.value if b and b.status else None,
                quantity_received=inv.quantity_received,
                quantity_available=inv.quantity_available,
                quantity_quarantined=inv.quantity_quarantined,
                updated_at=inv.updated_at
            )
        )
    return results


@router.get("/transfers/incoming", response_model=List[TransferDetailResponse])
def list_incoming_transfers(
    confirmed: Optional[bool] = None,
    user_payload: dict = Depends(get_current_user_payload),
    db: Session = Depends(get_db),
):
    """List incoming custody transfers addressed to authenticated user's organization."""
    org_id = user_payload.get("org_id")
    if not org_id:
        raise HTTPException(status_code=400, detail="User is not affiliated with an organization")

    query = db.query(CustodyTransfer).filter(CustodyTransfer.to_organization_id == org_id)
    if confirmed is not None:
        query = query.filter(CustodyTransfer.is_confirmed == confirmed)

    transfers = query.order_by(CustodyTransfer.timestamp.desc()).all()
    results = []
    for t in transfers:
        b = t.batch
        med = b.medicine if b else None
        from_org = t.from_organization
        to_org = t.to_organization
        results.append(
            TransferDetailResponse(
                id=t.id,
                batch_id=t.batch_id,
                batch_number=b.batch_number if b else "Unknown",
                gtin_barcode=b.gtin_barcode if b else "Unknown",
                medicine_brand_name=med.brand_name if med else "Unknown Product",
                medicine_generic_name=med.generic_name if med else "Unknown Molecule",
                dosage_form=med.dosage_form if med else None,
                stage=t.stage.value,
                from_organization_id=t.from_organization_id,
                from_organization_name=from_org.name if from_org else "Origin",
                to_organization_id=t.to_organization_id,
                to_organization_name=to_org.name if to_org else "Destination",
                transferred_quantity=t.transferred_quantity,
                verified_quantity=t.verified_quantity,
                has_discrepancy=t.has_discrepancy,
                discrepancy_notes=t.discrepancy_notes,
                is_confirmed=t.is_confirmed,
                location_name=t.location_name,
                expiry_date=b.expiry_date.isoformat() if b and b.expiry_date else "",
                batch_status=b.status.value if b and b.status else "",
                timestamp=t.timestamp
            )
        )
    return results


@router.get("/transfers/outgoing", response_model=List[TransferDetailResponse])
def list_outgoing_transfers(
    user_payload: dict = Depends(get_current_user_payload),
    db: Session = Depends(get_db),
):
    """List outgoing custody transfers dispatched from authenticated user's organization."""
    org_id = user_payload.get("org_id")
    if not org_id:
        raise HTTPException(status_code=400, detail="User is not affiliated with an organization")

    transfers = db.query(CustodyTransfer).filter(
        CustodyTransfer.from_organization_id == org_id
    ).order_by(CustodyTransfer.timestamp.desc()).all()

    results = []
    for t in transfers:
        b = t.batch
        med = b.medicine if b else None
        from_org = t.from_organization
        to_org = t.to_organization
        results.append(
            TransferDetailResponse(
                id=t.id,
                batch_id=t.batch_id,
                batch_number=b.batch_number if b else "Unknown",
                gtin_barcode=b.gtin_barcode if b else "Unknown",
                medicine_brand_name=med.brand_name if med else "Unknown Product",
                medicine_generic_name=med.generic_name if med else "Unknown Molecule",
                dosage_form=med.dosage_form if med else None,
                stage=t.stage.value,
                from_organization_id=t.from_organization_id,
                from_organization_name=from_org.name if from_org else "Origin",
                to_organization_id=t.to_organization_id,
                to_organization_name=to_org.name if to_org else "Destination",
                transferred_quantity=t.transferred_quantity,
                verified_quantity=t.verified_quantity,
                has_discrepancy=t.has_discrepancy,
                discrepancy_notes=t.discrepancy_notes,
                is_confirmed=t.is_confirmed,
                location_name=t.location_name,
                expiry_date=b.expiry_date.isoformat() if b and b.expiry_date else "",
                batch_status=b.status.value if b and b.status else "",
                timestamp=t.timestamp
            )
        )
    return results


@router.post("/transfers/{transfer_id}/receive", response_model=TransferDetailResponse)
def receive_incoming_transfer(
    transfer_id: str,
    req: TransferReceiveRequest,
    user_payload: dict = Depends(get_current_user_payload),
    db: Session = Depends(get_db),
):
    """
    Reconcile and accept an incoming shipment transfer.
    Verifies physical quantity received against expected manifest.
    Creates high severity alert on discrepancy and updates destination inventory atomically.
    """
    transfer = db.query(CustodyTransfer).filter(CustodyTransfer.id == transfer_id).first()
    if not transfer:
        raise HTTPException(status_code=404, detail="Transfer shipment not found")

    user_org_id = user_payload.get("org_id")
    if transfer.to_organization_id != user_org_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied: shipment is designated for organization {transfer.to_organization_id}, not your organization {user_org_id}"
        )

    if transfer.is_confirmed:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="SHIPMENT_ALREADY_RECEIVED: This shipment transfer has already been confirmed and received."
        )

    batch = db.query(Batch).filter(Batch.id == transfer.batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch associated with transfer not found")

    if batch.status in [BatchStatusEnum.DEAD_BATCH, BatchStatusEnum.DESTROYED]:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot receive stock for batch {batch.batch_number} in destroyed/dead status {batch.status.value}"
        )

    expected = transfer.transferred_quantity
    received = req.verified_quantity
    discrepancy = received - expected

    transfer.verified_quantity = received
    transfer.is_confirmed = True
    transfer.to_actor_user_id = user_payload.get("sub")
    if req.location_name:
        transfer.location_name = req.location_name

    # Check and flag quantity discrepancies
    if discrepancy != 0:
        transfer.has_discrepancy = True
        prefix = f"{req.discrepancy_notes} | " if req.discrepancy_notes else ""
        notes = f"{prefix}Physical count discrepancy: expected {expected} units, received {received} units (Variance: {discrepancy:+d})."
        transfer.discrepancy_notes = notes

        # Raise HIGH alert
        create_alert(
            db=db,
            alert_type=AlertType.QUANTITY_DISCREPANCY,
            severity=AlertSeverity.HIGH,
            title=f"Receiving Discrepancy: Batch {batch.batch_number}",
            message=notes,
            entity_type="TRANSFER",
            entity_id=transfer.id,
            auto_flush=False
        )
    else:
        transfer.has_discrepancy = False
        transfer.discrepancy_notes = req.discrepancy_notes or "Exact physical quantity match verified."

    # Update recipient inventory atomically
    inv = receive_inventory(db, transfer.to_organization_id, transfer.batch_id, received)

    # Update Batch current custodian and status
    batch.current_custodian_id = transfer.to_organization_id
    if transfer.stage == TransferStageEnum.MANUFACTURE_TO_DISTRIBUTOR:
        batch.status = BatchStatusEnum.IN_DISTRIBUTION
    elif transfer.stage == TransferStageEnum.DISTRIBUTOR_TO_PHARMACY:
        batch.status = BatchStatusEnum.AT_PHARMACY

    # Audit Trail
    audit = AuditLog(
        id=f"aud_{uuid.uuid4().hex[:12]}",
        action="SHIPMENT_RECEIVED_RECONCILED",
        entity_type="CUSTODY_TRANSFER",
        entity_id=transfer.id,
        actor_user_id=user_payload.get("sub"),
        actor_role=user_payload.get("role"),
        details=f"Org {user_org_id} received {received}/{expected} units of batch {batch.batch_number}. Discrepancy: {discrepancy:+d}."
    )
    db.add(audit)
    db.commit()
    db.refresh(transfer)

    b = transfer.batch
    med = b.medicine if b else None
    return TransferDetailResponse(
        id=transfer.id,
        batch_id=transfer.batch_id,
        batch_number=b.batch_number if b else "Unknown",
        gtin_barcode=b.gtin_barcode if b else "Unknown",
        medicine_brand_name=med.brand_name if med else "Unknown Product",
        medicine_generic_name=med.generic_name if med else "Unknown Molecule",
        dosage_form=med.dosage_form if med else None,
        stage=transfer.stage.value,
        from_organization_id=transfer.from_organization_id,
        from_organization_name=transfer.from_organization.name if transfer.from_organization else "Origin",
        to_organization_id=transfer.to_organization_id,
        to_organization_name=transfer.to_organization.name if transfer.to_organization else "Destination",
        transferred_quantity=transfer.transferred_quantity,
        verified_quantity=transfer.verified_quantity,
        has_discrepancy=transfer.has_discrepancy,
        discrepancy_notes=transfer.discrepancy_notes,
        is_confirmed=transfer.is_confirmed,
        location_name=transfer.location_name,
        expiry_date=b.expiry_date.isoformat() if b and b.expiry_date else "",
        batch_status=b.status.value if b and b.status else "",
        timestamp=transfer.timestamp
    )


@router.post("/transfers/dispatch", response_model=TransferDetailResponse, status_code=status.HTTP_201_CREATED)
def dispatch_transfer(
    req: TransferDispatchRequest,
    user_payload: dict = Depends(get_current_user_payload),
    db: Session = Depends(get_db),
):
    """
    Dispatch stock to downstream supply chain partner.
    Validates ownership, available inventory, batch status, and partner role.
    Atomically decrements sender inventory and creates unconfirmed transfer record.
    """
    sender_org_id = user_payload.get("org_id")
    user_role = user_payload.get("role")
    if not sender_org_id:
        raise HTTPException(status_code=400, detail="Authenticated user is not affiliated with an organization")

    # Destination organization check
    dest_org = db.query(Organization).filter(Organization.id == req.to_organization_id).first()
    if not dest_org:
        raise HTTPException(status_code=404, detail="Destination organization not found")

    # Determine transfer stage & enforce partner role compatibility
    if user_role == "DISTRIBUTOR":
        if dest_org.role_type != RoleEnum.PHARMACY:
            raise HTTPException(
                status_code=400,
                detail=f"Distributor can only dispatch to a licensed PHARMACY, got {dest_org.role_type.value}"
            )
        stage = TransferStageEnum.DISTRIBUTOR_TO_PHARMACY
    elif user_role == "MANUFACTURER":
        if dest_org.role_type != RoleEnum.DISTRIBUTOR:
            raise HTTPException(
                status_code=400,
                detail=f"Manufacturer can only dispatch to a licensed DISTRIBUTOR, got {dest_org.role_type.value}"
            )
        stage = TransferStageEnum.MANUFACTURE_TO_DISTRIBUTOR
    elif user_role == "ADMIN":
        stage = TransferStageEnum.DISTRIBUTOR_TO_PHARMACY if dest_org.role_type == RoleEnum.PHARMACY else TransferStageEnum.MANUFACTURE_TO_DISTRIBUTOR
    else:
        raise HTTPException(status_code=403, detail=f"Role {user_role} is not permitted to initiate supply chain dispatches")

    # Batch validation
    batch = db.query(Batch).filter(
        or_(Batch.id == req.batch_id, Batch.batch_number == req.batch_id)
    ).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    if batch.status in [BatchStatusEnum.DEAD_BATCH, BatchStatusEnum.DESTROYED, BatchStatusEnum.RECALLED]:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot transfer batch {batch.batch_number} in status {batch.status.value}"
        )

    # Check available inventory at sender organization
    source_inv = db.query(Inventory).filter(
        Inventory.organization_id == sender_org_id,
        Inventory.batch_id == batch.id
    ).first()

    available = source_inv.quantity_available if source_inv else 0
    if not source_inv or available < req.quantity:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient stock: requested {req.quantity} units, but available stock is {available} units"
        )

    # Atomically decrement sender inventory
    source_inv.quantity_available -= req.quantity
    source_inv.updated_at = datetime.now(timezone.utc)

    # Create unconfirmed custody transfer manifest
    transfer_id = f"trn_{uuid.uuid4().hex[:12]}"
    transfer = CustodyTransfer(
        id=transfer_id,
        batch_id=batch.id,
        stage=stage,
        from_organization_id=sender_org_id,
        to_organization_id=req.to_organization_id,
        transferred_quantity=req.quantity,
        verified_quantity=None,
        has_discrepancy=False,
        discrepancy_notes=req.notes,
        from_actor_user_id=user_payload.get("sub"),
        location_name=req.location_name or "Outbound Shipping Bay",
        is_confirmed=False,  # Unconfirmed until recipient physically reconciles
        timestamp=datetime.now(timezone.utc)
    )
    db.add(transfer)

    # Audit Log
    audit = AuditLog(
        id=f"aud_{uuid.uuid4().hex[:12]}",
        action="TRANSFER_DISPATCHED",
        entity_type="CUSTODY_TRANSFER",
        entity_id=transfer.id,
        actor_user_id=user_payload.get("sub"),
        actor_role=user_role,
        details=f"Dispatched {req.quantity} units of {batch.batch_number} to {dest_org.name} ({dest_org.id})."
    )
    db.add(audit)
    db.commit()
    db.refresh(transfer)

    b = transfer.batch
    med = b.medicine if b else None
    return TransferDetailResponse(
        id=transfer.id,
        batch_id=transfer.batch_id,
        batch_number=b.batch_number if b else "Unknown",
        gtin_barcode=b.gtin_barcode if b else "Unknown",
        medicine_brand_name=med.brand_name if med else "Unknown Product",
        medicine_generic_name=med.generic_name if med else "Unknown Molecule",
        dosage_form=med.dosage_form if med else None,
        stage=transfer.stage.value,
        from_organization_id=transfer.from_organization_id,
        from_organization_name=transfer.from_organization.name if transfer.from_organization else "Origin",
        to_organization_id=transfer.to_organization_id,
        to_organization_name=dest_org.name,
        transferred_quantity=transfer.transferred_quantity,
        verified_quantity=None,
        has_discrepancy=False,
        discrepancy_notes=transfer.discrepancy_notes,
        is_confirmed=False,
        location_name=transfer.location_name,
        expiry_date=b.expiry_date.isoformat() if b and b.expiry_date else "",
        batch_status=b.status.value if b and b.status else "",
        timestamp=transfer.timestamp
    )


@router.post("/receive", response_model=InventoryResponse, status_code=status.HTTP_201_CREATED)
def receive_stock(
    req: InventoryReceiveRequest,
    user_payload: dict = Depends(get_current_user_payload),
    db: Session = Depends(get_db),
):
    """Directly record receipt of a batch at an organization (legacy / administrative)."""
    batch = db.query(Batch).filter(Batch.id == req.batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    if batch.status in [BatchStatusEnum.DEAD_BATCH, BatchStatusEnum.DESTROYED]:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot receive destroyed/dead batch {batch.batch_number}"
        )

    inv = receive_inventory(db, req.organization_id, req.batch_id, req.quantity)

    # Audit
    audit = AuditLog(
        id=f"aud_{uuid.uuid4().hex[:12]}",
        action="INVENTORY_RECEIVED",
        entity_type="BATCH",
        entity_id=req.batch_id,
        actor_user_id=user_payload.get("sub"),
        actor_role=user_payload.get("role"),
        details=f"Org {req.organization_id} received {req.quantity} units of batch {batch.batch_number}.",
    )
    db.add(audit)
    db.commit()
    db.refresh(inv)
    return inv


@router.post("/transfer", response_model=InventoryResponse, status_code=status.HTTP_201_CREATED)
def transfer_stock(
    req: InventoryTransferRequest,
    user_payload: dict = Depends(get_current_user_payload),
    db: Session = Depends(get_db),
):
    """Directly transfer inventory between organizations (legacy / administrative)."""
    batch = db.query(Batch).filter(Batch.id == req.batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    if batch.status in [BatchStatusEnum.DEAD_BATCH, BatchStatusEnum.RECALLED]:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot transfer batch {batch.batch_number} with status {batch.status.value}"
        )

    try:
        source, dest = transfer_inventory(
            db, req.batch_id, req.from_org_id, req.to_org_id, req.quantity
        )
    except InsufficientStockError as e:
        raise HTTPException(status_code=400, detail=str(e))

    audit = AuditLog(
        id=f"aud_{uuid.uuid4().hex[:12]}",
        action="INVENTORY_TRANSFERRED",
        entity_type="BATCH",
        entity_id=req.batch_id,
        actor_user_id=user_payload.get("sub"),
        actor_role=user_payload.get("role"),
        details=f"Transferred {req.quantity} units of {batch.batch_number} from {req.from_org_id} to {req.to_org_id}.",
    )
    db.add(audit)
    db.commit()
    db.refresh(dest)
    return dest
