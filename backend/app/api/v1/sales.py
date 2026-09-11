"""
Sales API — Authoritative Point-of-Sale Verification & Sale Blocking Gateway.

Business Rules:
  - Backend is the sole authoritative decision engine for all sale authorizations.
  - The frontend MUST NEVER decide whether a medicine can be sold.
  - An 8-point validation pipeline evaluates every pre-check and sale attempt:
      1. Batch lookup (valid registration vs unknown/counterfeit)
      2. Dead Batch Registry check (certified destroyed stock)
      3. Recall check (manufacturer / regulatory mandatory recall)
      4. Expiry horizon check (expiration date comparison)
      5. Regulatory suspension check (FLAGGED_SUSPICIOUS)
      6. Reverse logistics quarantine check (RETURN_INITIATED, RETURN_IN_TRANSIT, RECEIVED_AT_DISPOSAL)
      7. Ownership & custody verification (seller facility custody check)
      8. Dispensary stock availability (quantity available in inventory)
  - DESTROYED, RECALLED, EXPIRED, QUARANTINED, or SUSPENDED batches must NEVER result in sale_allowed=True.
  - All sale attempts (allowed or blocked) are permanently logged in the sales ledger.
  - Blocked sales generate high/critical alerts.
  - All transactions generate 21 CFR Part 11 compliant AuditLog entries.
"""
import uuid
from datetime import date, datetime, timezone
from typing import List, Optional, Tuple, Any, Dict
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from backend.app.core.security import get_current_user_payload, RoleChecker
from backend.app.db.session import get_db
from backend.app.models.batch import Batch, BatchStatusEnum
from backend.app.models.sale import Sale, SaleBlockReason
from backend.app.models.inventory import Inventory
from backend.app.models.dead_batch import DeadBatch
from backend.app.models.audit import AuditLog
from backend.app.models.alert import AlertType, AlertSeverity
from backend.app.services.inventory_service import deduct_for_sale, InsufficientStockError
from backend.app.services.alert_service import create_alert

router = APIRouter()


# --- Schemas ---

class ValidationCheckDetail(BaseModel):
    name: str
    passed: bool
    status: str
    message: str


class SaleVerifyRequest(BaseModel):
    batch_identifier: str = Field(..., description="Batch ID, Batch Number (e.g. B1001), or GS1 Barcode")
    quantity: int = Field(1, gt=0, description="Quantity of units requested for sale")
    customer_reference: Optional[str] = Field(None, description="Patient or prescription reference")


class SaleVerifyResponse(BaseModel):
    batch_id: Optional[str] = None
    batch_number: Optional[str] = None
    medicine_name: Optional[str] = None
    dosage_form: Optional[str] = None
    gtin_barcode: Optional[str] = None
    expiry_date: Optional[str] = None
    requested_quantity: int
    available_quantity: int
    is_eligible_for_sale: bool
    verdict: str  # "ALLOW_SALE" or "BLOCK_SALE"
    block_reason: Optional[str] = None
    block_message: Optional[str] = None
    action_guidance: str
    checks: List[ValidationCheckDetail]
    timestamp: datetime


class SaleRequest(BaseModel):
    batch_id: Optional[str] = None
    batch_number: Optional[str] = None
    batch_identifier: Optional[str] = None
    quantity: int = Field(..., gt=0)
    customer_reference: Optional[str] = None


class SaleResponse(BaseModel):
    id: str
    batch_id: str
    batch_number: Optional[str] = None
    medicine_name: Optional[str] = None
    seller_org_id: str
    sold_by_user_id: Optional[str] = None
    customer_reference: Optional[str] = None
    quantity_sold: int
    sale_allowed: bool
    block_reason: Optional[str] = None
    block_message: Optional[str] = None
    timestamp: datetime

    class Config:
        from_attributes = True


# --- Helper Functions ---

def resolve_batch(db: Session, identifier: str) -> Optional[Batch]:
    """Resolves batch from batch_id, batch_number, or GS1 QR/barcode."""
    clean_id = identifier.strip()
    if ":" in clean_id:
        # Full QR payload e.g. "PHARMASAFE:B1001:8901088..."
        parts = clean_id.split(":")
        if len(parts) >= 2:
            clean_id = parts[1].strip()

    batch = db.query(Batch).filter(
        (Batch.id == clean_id) |
        (Batch.batch_number == clean_id) |
        (Batch.gtin_barcode == clean_id)
    ).first()
    return batch


def evaluate_sale_eligibility(
    db: Session,
    batch_identifier: str,
    quantity: int,
    seller_org_id: str
) -> Dict[str, Any]:
    """
    Executes the authoritative 8-point algorithmic verification pipeline.
    Returns structured results for both pre-check and transaction commit.
    """
    today = date.today()
    batch = resolve_batch(db, batch_identifier)
    checks: List[ValidationCheckDetail] = []
    
    # 1. BATCH REGISTRATION LOOKUP CHECK
    if not batch:
        checks.append(ValidationCheckDetail(
            name="Batch Ledger Registry",
            passed=False,
            status="NOT_FOUND",
            message="Batch identifier not recognized in National PharmaSafe Ledger. High counterfeit probability."
        ))
        return {
            "batch": None,
            "batch_id": None,
            "batch_number": batch_identifier,
            "medicine_name": "Unregistered Substance",
            "dosage_form": "Unknown",
            "gtin_barcode": None,
            "expiry_date": None,
            "available_quantity": 0,
            "is_eligible_for_sale": False,
            "verdict": "BLOCK_SALE",
            "block_reason": SaleBlockReason.NOT_FOUND,
            "block_message": "Batch not found in PharmaSafe National Registry. Possible unregistered counterfeit.",
            "action_guidance": "DO NOT DISPENSE. Quarantining substance and raise counterfeit incident alert immediately.",
            "checks": checks
        }

    checks.append(ValidationCheckDetail(
        name="Batch Ledger Registry",
        passed=True,
        status="REGISTERED",
        message=f"Batch {batch.batch_number} verified in National PharmaSafe Ledger."
    ))

    # 2. DEAD BATCH REGISTRY CHECK (CRITICAL)
    dead_entry = db.query(DeadBatch).filter(
        (DeadBatch.batch_id == batch.id) |
        (DeadBatch.batch_number == batch.batch_number) |
        (DeadBatch.gtin_barcode == batch.gtin_barcode)
    ).first()
    
    is_dead = dead_entry is not None or batch.status in [BatchStatusEnum.DEAD_BATCH, BatchStatusEnum.DESTROYED]
    if is_dead:
        checks.append(ValidationCheckDetail(
            name="Dead Batch Registry",
            passed=False,
            status="DESTROYED_MATCH",
            message=f"CRITICAL: Officially destroyed on certificate {dead_entry.destruction_cert_hash[:16] if dead_entry else 'CERT'}... Inscribed in Dead Batch Registry."
        ))
    else:
        checks.append(ValidationCheckDetail(
            name="Dead Batch Registry",
            passed=True,
            status="CLEARED",
            message="Cleared from Dead Batch Registry. No destruction certificate match."
        ))

    # 3. RECALL SURVEILLANCE CHECK
    is_recalled = batch.is_recalled or batch.status == BatchStatusEnum.RECALLED
    if is_recalled:
        checks.append(ValidationCheckDetail(
            name="Recall Surveillance",
            passed=False,
            status="MANDATORY_RECALL",
            message=f"Mandatory safety recall: {batch.recall_reason or 'Regulatory safety directive'}."
        ))
    else:
        checks.append(ValidationCheckDetail(
            name="Recall Surveillance",
            passed=True,
            status="NO_RECALL",
            message="No active recalls on record for this formulation."
        ))

    # 4. EXPIRY HORIZON CHECK
    is_expired = batch.expiry_date < today
    if is_expired:
        checks.append(ValidationCheckDetail(
            name="Expiry Horizon Check",
            passed=False,
            status="EXPIRED",
            message=f"Batch expired on {batch.expiry_date}. CDSCO Drug Disposal Mandate prohibits dispensing."
        ))
    else:
        days_left = (batch.expiry_date - today).days
        checks.append(ValidationCheckDetail(
            name="Expiry Horizon Check",
            passed=True,
            status="VALID_DATE",
            message=f"Valid shelf-life ({days_left} days remaining until {batch.expiry_date})."
        ))

    # 5. REGULATORY SUSPENSION / INTEGRITY CHECK
    is_suspended = batch.status == BatchStatusEnum.FLAGGED_SUSPICIOUS
    if is_suspended:
        checks.append(ValidationCheckDetail(
            name="Suspension & Integrity",
            passed=False,
            status="SUSPENDED",
            message="Batch flagged suspicious due to elevated supply-chain anomaly risk."
        ))
    else:
        checks.append(ValidationCheckDetail(
            name="Suspension & Integrity",
            passed=True,
            status="ACTIVE_INTEGRITY",
            message="Supply-chain integrity score within normal parameters."
        ))

    # 6. REVERSE LOGISTICS QUARANTINE CHECK
    is_quarantined = batch.status in [
        BatchStatusEnum.RETURN_INITIATED,
        BatchStatusEnum.RETURN_IN_TRANSIT,
        BatchStatusEnum.RECEIVED_AT_DISPOSAL
    ]
    if is_quarantined:
        checks.append(ValidationCheckDetail(
            name="Reverse Chain Quarantine",
            passed=False,
            status="QUARANTINED",
            message=f"Batch is quarantined in reverse supply chain ({batch.status.value})."
        ))
    else:
        checks.append(ValidationCheckDetail(
            name="Reverse Chain Quarantine",
            passed=True,
            status="FORWARD_COMMERCE",
            message="Stock is cleared for forward point-of-sale commerce."
        ))

    # 7. INVENTORY AVAILABILITY CHECK
    inv = db.query(Inventory).filter(
        Inventory.organization_id == seller_org_id,
        Inventory.batch_id == batch.id,
    ).first()
    available_qty = inv.quantity_available if inv else 0
    has_sufficient_stock = available_qty >= quantity

    if not has_sufficient_stock:
        checks.append(ValidationCheckDetail(
            name="Dispensary Stock Availability",
            passed=False,
            status="INSUFFICIENT_STOCK",
            message=f"Requested {quantity} units, but only {available_qty} units available in facility inventory."
        ))
    else:
        checks.append(ValidationCheckDetail(
            name="Dispensary Stock Availability",
            passed=True,
            status="SUFFICIENT_STOCK",
            message=f"Available on shelf: {available_qty} units (Requested: {quantity})."
        ))

    # 8. CUSTODY & OWNERSHIP CHECK
    # Check if seller organization is custodian or has received inventory
    is_custodian = (batch.current_custodian_id == seller_org_id) or (inv is not None and inv.quantity_received > 0)
    if not is_custodian:
        checks.append(ValidationCheckDetail(
            name="Custody & Ownership Check",
            passed=False,
            status="CUSTODY_MISMATCH",
            message=f"Batch custodian is {batch.current_custodian.name if batch.current_custodian else batch.current_custodian_id}, not your facility."
        ))
    else:
        checks.append(ValidationCheckDetail(
            name="Custody & Ownership Check",
            passed=True,
            status="VERIFIED_CUSTODIAN",
            message="Custody verified. Organization possesses legitimate title to batch."
        ))

    # --- FINAL VERDICT DETERMINATION ---
    med_name = batch.medicine.brand_name if batch.medicine else "Pharmaceutical Formulation"
    dosage = batch.medicine.dosage_form if batch.medicine else "Unit"

    if is_dead:
        verdict = "BLOCK_SALE"
        block_reason = SaleBlockReason.DESTROYED
        block_message = (
            f"CRITICAL SALE BLOCKED: Batch {batch.batch_number} is inscribed in the Dead Batch Registry. "
            f"Cert: {dead_entry.destruction_cert_hash[:16] if dead_entry else 'CERT'}... "
            f"This batch was officially DESTROYED and must NEVER be dispensed."
        )
        guidance = "MANDATORY LOCKOUT: Seize physical units immediately. Report hazardous re-entry breach to CDSCO inspectorate."
    elif is_recalled:
        verdict = "BLOCK_SALE"
        block_reason = SaleBlockReason.RECALLED
        block_message = (
            f"SALE BLOCKED: Batch {batch.batch_number} is under mandatory safety recall. "
            f"Reason: {batch.recall_reason or 'Safety advisory issued by manufacturer/CDSCO.'}"
        )
        guidance = "Move physical stock to reverse quarantine cage and create a return manifest."
    elif is_expired:
        verdict = "BLOCK_SALE"
        block_reason = SaleBlockReason.EXPIRED
        block_message = (
            f"SALE BLOCKED: Batch {batch.batch_number} expired on {batch.expiry_date}. "
            "Dispensing expired medicine violates CDSCO Drug Disposal Mandate § 14-B."
        )
        guidance = "Transfer physical boxes to reverse logistics quarantine for authorized destruction."
    elif is_suspended:
        verdict = "BLOCK_SALE"
        block_reason = SaleBlockReason.FLAGGED_SUSPICIOUS
        block_message = f"SALE BLOCKED: Batch {batch.batch_number} is flagged suspicious. Transaction suspended."
        guidance = "Contact pharmacy compliance officer to verify batch provenance before release."
    elif is_quarantined:
        verdict = "BLOCK_SALE"
        block_reason = SaleBlockReason.QUARANTINED
        block_message = f"SALE BLOCKED: Batch {batch.batch_number} is in reverse logistics ({batch.status.value})."
        guidance = "Stock is marked for reverse return and cannot be returned to commercial trade."
    elif not is_custodian:
        verdict = "BLOCK_SALE"
        block_reason = SaleBlockReason.NOT_OWNER
        block_message = f"SALE BLOCKED: Custody verification failed. Batch is not assigned to your organization."
        guidance = "Reconcile inbound distributor consignment manifest before attempting sale."
    elif not has_sufficient_stock:
        verdict = "BLOCK_SALE"
        block_reason = SaleBlockReason.INSUFFICIENT_STOCK
        block_message = f"SALE BLOCKED: Insufficient inventory. Requested {quantity}, available {available_qty} units."
        guidance = "Reduce requested sale quantity or log inbound stock intake."
    else:
        verdict = "ALLOW_SALE"
        block_reason = None
        block_message = None
        guidance = "Batch verified authentic, within safe shelf-life window, and clear of regulatory recalls. Safe for patient dispensing."

    return {
        "batch": batch,
        "batch_id": batch.id,
        "batch_number": batch.batch_number,
        "medicine_name": med_name,
        "dosage_form": dosage,
        "gtin_barcode": batch.gtin_barcode,
        "expiry_date": str(batch.expiry_date),
        "available_quantity": available_qty,
        "is_eligible_for_sale": (verdict == "ALLOW_SALE"),
        "verdict": verdict,
        "block_reason": block_reason,
        "block_message": block_message,
        "action_guidance": guidance,
        "checks": checks
    }


# --- API Endpoints ---

@router.post("/verify", response_model=SaleVerifyResponse, status_code=status.HTTP_200_OK)
def verify_sale_eligibility_endpoint(
    req: SaleVerifyRequest,
    user_payload: dict = Depends(RoleChecker(["PHARMACY", "DISTRIBUTOR", "ADMIN"])),
    db: Session = Depends(get_db),
):
    """
    Authoritative Point-of-Sale pre-flight safety check.
    Evaluates the complete 8-point validation pipeline WITHOUT modifying inventory.
    """
    org_id = user_payload.get("org_id")
    if not org_id:
        raise HTTPException(status_code=400, detail="User is not associated with an organization")

    eval_result = evaluate_sale_eligibility(
        db=db,
        batch_identifier=req.batch_identifier,
        quantity=req.quantity,
        seller_org_id=org_id
    )

    return SaleVerifyResponse(
        batch_id=eval_result["batch_id"],
        batch_number=eval_result["batch_number"],
        medicine_name=eval_result["medicine_name"],
        dosage_form=eval_result["dosage_form"],
        gtin_barcode=eval_result["gtin_barcode"],
        expiry_date=eval_result["expiry_date"],
        requested_quantity=req.quantity,
        available_quantity=eval_result["available_quantity"],
        is_eligible_for_sale=eval_result["is_eligible_for_sale"],
        verdict=eval_result["verdict"],
        block_reason=eval_result["block_reason"].value if eval_result["block_reason"] else None,
        block_message=eval_result["block_message"],
        action_guidance=eval_result["action_guidance"],
        checks=eval_result["checks"],
        timestamp=datetime.now(timezone.utc)
    )


@router.post("", status_code=status.HTTP_200_OK)
def record_sale(
    sale_req: SaleRequest,
    user_payload: dict = Depends(RoleChecker(["PHARMACY", "DISTRIBUTOR", "ADMIN"])),
    db: Session = Depends(get_db),
):
    """
    Attempt to authorize and record a point-of-sale transaction.
    Backend independently evaluates the 8-point pipeline.
    If allowed: atomically deducts stock and logs audit.
    If blocked: records blocked sale attempt and creates regulatory alerts.
    """
    org_id = user_payload.get("org_id")
    if not org_id:
        raise HTTPException(status_code=400, detail="User is not associated with an organization")

    identifier = sale_req.batch_id or sale_req.batch_number or sale_req.batch_identifier
    if not identifier:
        raise HTTPException(status_code=400, detail="Must provide batch_id, batch_number, or batch_identifier")

    eval_result = evaluate_sale_eligibility(
        db=db,
        batch_identifier=identifier,
        quantity=sale_req.quantity,
        seller_org_id=org_id
    )

    sale_id = f"sal_{uuid.uuid4().hex[:12]}"
    batch = eval_result["batch"]
    sale_allowed = eval_result["is_eligible_for_sale"]
    block_reason = eval_result["block_reason"]
    block_message = eval_result["block_message"]
    batch_num = eval_result["batch_number"] or "UNKNOWN"

    if not batch:
        # Unknown batch — record counterfeit sale attempt
        sale = Sale(
            id=sale_id,
            batch_id=sale_req.batch_id or identifier,
            seller_org_id=org_id,
            sold_by_user_id=user_payload.get("sub"),
            quantity_sold=sale_req.quantity,
            customer_reference=sale_req.customer_reference,
            sale_allowed=False,
            block_reason=SaleBlockReason.NOT_FOUND,
            block_message=block_message,
        )
        db.add(sale)
        db.commit()

        # Generate counterfeit alert
        create_alert(
            db,
            alert_type=AlertType.SYSTEM_INFO,
            severity=AlertSeverity.HIGH,
            title=f"Counterfeit Sale Attempt: {identifier}",
            message=block_message or "Sale attempt on unregistered barcode.",
            entity_type="SALE",
            entity_id=sale_id,
        )

        return {
            "success": False,
            "sale_allowed": False,
            "error": {"code": "SALE_BLOCKED", "message": block_message},
            "sale": SaleResponse(
                id=sale.id,
                batch_id=sale.batch_id,
                batch_number=batch_num,
                medicine_name="Unregistered Substance",
                seller_org_id=sale.seller_org_id,
                sold_by_user_id=sale.sold_by_user_id,
                customer_reference=sale.customer_reference,
                quantity_sold=sale.quantity_sold,
                sale_allowed=False,
                block_reason=block_reason.value if block_reason else None,
                block_message=block_message,
                timestamp=sale.timestamp
            ),
        }

    # Record sale attempt in sales ledger
    sale = Sale(
        id=sale_id,
        batch_id=batch.id,
        seller_org_id=org_id,
        sold_by_user_id=user_payload.get("sub"),
        quantity_sold=sale_req.quantity,
        customer_reference=sale_req.customer_reference,
        sale_allowed=sale_allowed,
        block_reason=block_reason,
        block_message=block_message,
    )
    db.add(sale)

    if sale_allowed:
        # Atomically deduct inventory
        try:
            deduct_for_sale(db, org_id, batch.id, sale_req.quantity)
        except InsufficientStockError as e:
            # Concurrency / race condition guard
            sale.sale_allowed = False
            sale.block_reason = SaleBlockReason.INSUFFICIENT_STOCK
            sale.block_message = str(e)
            block_message = str(e)
            sale_allowed = False

    if not sale.sale_allowed:
        # Generate automated alert for blocked sale
        alert_type_map = {
            SaleBlockReason.EXPIRED: AlertType.SALE_BLOCKED_EXPIRED,
            SaleBlockReason.RECALLED: AlertType.SALE_BLOCKED_RECALLED,
            SaleBlockReason.DESTROYED: AlertType.SALE_BLOCKED_DESTROYED,
        }
        alert_type = alert_type_map.get(block_reason, AlertType.SYSTEM_INFO)
        severity = AlertSeverity.CRITICAL if block_reason == SaleBlockReason.DESTROYED else AlertSeverity.HIGH

        create_alert(
            db,
            alert_type=alert_type,
            severity=severity,
            title=f"Sale Blocked: {batch.batch_number}",
            message=sale.block_message or "Point-of-Sale lockout triggered.",
            entity_type="BATCH",
            entity_id=batch.id,
        )

    # Inscribe 21 CFR Part 11 Audit Log
    audit = AuditLog(
        id=f"aud_{uuid.uuid4().hex[:12]}",
        action="SALE_RECORDED" if sale.sale_allowed else "SALE_BLOCKED",
        entity_type="SALE",
        entity_id=sale_id,
        actor_user_id=user_payload.get("sub"),
        actor_role=user_payload.get("role"),
        details=(
            f"Point-of-Sale {'AUTHORIZED' if sale.sale_allowed else 'BLOCKED'}: "
            f"{sale_req.quantity} units of {batch.batch_number}. "
            f"Customer Ref: {sale_req.customer_reference or 'N/A'}. "
            f"{block_message or 'Transaction completed successfully.'}"
        ),
    )
    db.add(audit)
    db.commit()
    db.refresh(sale)

    sale_res = SaleResponse(
        id=sale.id,
        batch_id=batch.id,
        batch_number=batch.batch_number,
        medicine_name=batch.medicine.brand_name if batch.medicine else None,
        seller_org_id=sale.seller_org_id,
        sold_by_user_id=sale.sold_by_user_id,
        customer_reference=sale.customer_reference,
        quantity_sold=sale.quantity_sold,
        sale_allowed=sale.sale_allowed,
        block_reason=sale.block_reason.value if sale.block_reason else None,
        block_message=sale.block_message,
        timestamp=sale.timestamp
    )

    if sale.sale_allowed:
        return {
            "success": True,
            "sale_allowed": True,
            "message": f"Sale of {sale_req.quantity} units of {batch.batch_number} recorded successfully.",
            "sale": sale_res,
        }
    else:
        return {
            "success": False,
            "sale_allowed": False,
            "error": {"code": "SALE_BLOCKED", "message": sale.block_message},
            "sale": sale_res,
        }


@router.get("", response_model=List[SaleResponse])
def list_sales(
    batch_id: Optional[str] = None,
    sale_allowed: Optional[bool] = None,
    search: Optional[str] = None,
    limit: int = Query(50, le=100),
    user_payload: dict = Depends(get_current_user_payload),
    db: Session = Depends(get_db),
):
    """
    List sales records for the authenticated facility.
    Filterable by batch, sale outcome, and search terms.
    """
    query = db.query(Sale)
    org_id = user_payload.get("org_id")
    role = user_payload.get("role")

    # Non-admin users see their organization's sales records
    if role not in ["ADMIN", "REGULATOR"] and org_id:
        query = query.filter(Sale.seller_org_id == org_id)

    if batch_id:
        query = query.filter(Sale.batch_id == batch_id)
    if sale_allowed is not None:
        query = query.filter(Sale.sale_allowed == sale_allowed)

    sales = query.order_by(Sale.timestamp.desc()).limit(limit).all()

    result: List[SaleResponse] = []
    for s in sales:
        b_num = s.batch.batch_number if s.batch else None
        m_name = s.batch.medicine.brand_name if s.batch and s.batch.medicine else None
        if search:
            q = search.lower()
            if not ((b_num and q in b_num.lower()) or (m_name and q in m_name.lower()) or (s.customer_reference and q in s.customer_reference.lower())):
                continue
        result.append(SaleResponse(
            id=s.id,
            batch_id=s.batch_id,
            batch_number=b_num,
            medicine_name=m_name,
            seller_org_id=s.seller_org_id,
            sold_by_user_id=s.sold_by_user_id,
            customer_reference=s.customer_reference,
            quantity_sold=s.quantity_sold,
            sale_allowed=s.sale_allowed,
            block_reason=s.block_reason.value if s.block_reason else None,
            block_message=s.block_message,
            timestamp=s.timestamp
        ))
    return result
