"""
Phase 9: Online Medicine Safety & Listing Verification API Router.

Endpoints:
- POST /api/v1/online-safety/verify: Pure deterministic evaluation of online listing data (ALLOW, REVIEW, BLOCK)
- POST /api/v1/online-safety/listings: Evaluates and persists listing, generating alerts for BLOCK/REVIEW
- GET /api/v1/online-safety/listings: Searchable list of evaluated online listings with filters
- GET /api/v1/online-safety/listings/{id}: Single listing details with 11-stage audit breakdown
- POST /api/v1/online-safety/listings/{id}/enforce: Regulatory enforcement actions (ISSUE_TAKEDOWN, etc.)
- GET /api/v1/online-safety/summary: Aggregate metrics for executive compliance overview
"""
import uuid
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.app.db.session import get_db
from backend.app.models.online_safety import (
    OnlineMedicineListing, ListingDecisionEnum, ListingRiskLevelEnum, ListingStatusEnum
)
from backend.app.models.batch import Batch
from backend.app.models.medicine import Medicine
from backend.app.models.user import User, Organization
from backend.app.models.alert import Alert, AlertSeverity, AlertType
from backend.app.models.audit import AuditLog
from backend.app.schemas.online_safety import (
    ListingVerificationRequest, ListingVerificationResponse,
    ListingCreate, ListingResponse, ListingEnforceRequest
)
from backend.app.services.online_safety_verifier import OnlineSafetyVerifier
from fastapi.security import HTTPAuthorizationCredentials
from backend.app.core.security import security_bearer, decode_access_token

router = APIRouter()


def get_optional_user_payload(
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer)
) -> Optional[dict]:
    if not auth or not auth.credentials:
        return None
    try:
        return decode_access_token(auth.credentials)
    except Exception:
        return None


@router.post("/verify", response_model=ListingVerificationResponse)
def verify_online_listing(
    request: ListingVerificationRequest,
    db: Session = Depends(get_db)
):
    """
    Evaluate an online medicine listing through the deterministic 11-stage verification pipeline.
    Does not require database insertion — ideal for pre-publish sandbox validation.
    """
    return OnlineSafetyVerifier.verify_listing(db, request)


@router.post("/listings", response_model=ListingResponse, status_code=status.HTTP_201_CREATED)
def create_and_verify_listing(
    listing_in: ListingCreate,
    db: Session = Depends(get_db),
    current_user: Optional[dict] = Depends(get_optional_user_payload)
):
    """
    Ingests an online listing, executes deterministic verification, stores the audit record,
    and automatically raises compliance alerts if BLOCK or REVIEW decision is reached.
    """
    # 1. Run deterministic verification
    verif_res = OnlineSafetyVerifier.verify_listing(db, listing_in)

    # 2. Resolve matching batch & medicine IDs if present
    batch_id = None
    medicine_id = None
    if listing_in.batch_number:
        b = db.query(Batch).filter(func.lower(Batch.batch_number) == listing_in.batch_number.strip().lower()).first()
        if b:
            batch_id = b.id
            medicine_id = b.medicine_id

    if not medicine_id and listing_in.claimed_product_name:
        m = db.query(Medicine).filter(
            (func.lower(Medicine.brand_name) == listing_in.claimed_product_name.strip().lower()) |
            (func.lower(Medicine.generic_name) == listing_in.claimed_product_name.strip().lower())
        ).first()
        if m:
            medicine_id = m.id

    # 3. Create persistent record
    listing_id = f"lst_{uuid.uuid4().hex[:12]}"
    ref_code = f"LST-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"

    initial_status = ListingStatusEnum.ACTIVE
    if verif_res.decision == ListingDecisionEnum.BLOCK.value:
        initial_status = ListingStatusEnum.BLOCKED
    elif verif_res.decision == ListingDecisionEnum.REVIEW.value:
        initial_status = ListingStatusEnum.PENDING_REVIEW
    elif verif_res.decision == ListingDecisionEnum.ALLOW.value:
        initial_status = ListingStatusEnum.PERMITTED

    stage_checks_json = {k: v.dict() for k, v in verif_res.stage_checks.items()}

    new_listing = OnlineMedicineListing(
        id=listing_id,
        listing_reference=ref_code,
        platform_name=listing_in.platform_name,
        listing_url=listing_in.listing_url,
        seller_name=listing_in.seller_name,
        seller_org_id=listing_in.seller_org_id,
        seller_license_number=listing_in.seller_license_number,
        claimed_product_name=listing_in.claimed_product_name,
        medicine_id=medicine_id,
        batch_number=listing_in.batch_number,
        batch_id=batch_id,
        offered_quantity=listing_in.offered_quantity,
        listed_price_inr=listing_in.listed_price_inr,
        claimed_qr_payload=listing_in.claimed_qr_payload,
        claimed_certificate_hash=listing_in.claimed_certificate_hash,
        verification_decision=ListingDecisionEnum(verif_res.decision),
        risk_level=ListingRiskLevelEnum(verif_res.risk_level),
        risk_score=verif_res.risk_score,
        decision_reasons=verif_res.decision_reasons,
        stage_checks=stage_checks_json,
        listing_status=initial_status,
        takedown_requested=(verif_res.decision == ListingDecisionEnum.BLOCK.value),
        takedown_requested_at=datetime.now(timezone.utc) if verif_res.decision == ListingDecisionEnum.BLOCK.value else None,
        reviewed_by_user_id=current_user.get("sub") if current_user else None
    )
    db.add(new_listing)

    # 4. If BLOCK or REVIEW, trigger automated Alert
    if verif_res.decision in [ListingDecisionEnum.BLOCK.value, ListingDecisionEnum.REVIEW.value]:
        alert_sev = AlertSeverity.CRITICAL if verif_res.risk_level == ListingRiskLevelEnum.CRITICAL.value else AlertSeverity.HIGH
        alert = Alert(
            id=f"alt_{uuid.uuid4().hex[:12]}",
            alert_type=AlertType.SUSPICIOUS_LISTING,
            severity=alert_sev,
            title=f"Online Listing Policy Violation: {verif_res.decision} on {listing_in.platform_name}",
            message=f"Merchant '{listing_in.seller_name}' listing '{listing_in.claimed_product_name}' (Batch: {listing_in.batch_number or 'N/A'}) flagged. {verif_res.summary}",
            entity_type="ONLINE_LISTING",
            entity_id=listing_id
        )
        db.add(alert)

    # 5. Audit Log
    audit = AuditLog(
        id=f"aud_{uuid.uuid4().hex[:12]}",
        action="ONLINE_LISTING_EVALUATED",
        entity_type="ONLINE_LISTING",
        entity_id=listing_id,
        actor_user_id=current_user.get("sub") if current_user else None,
        actor_role=current_user.get("role") if current_user else "AUTOMATED_SCANNER",
        details=f"Evaluated listing on {listing_in.platform_name}: {verif_res.decision} ({verif_res.summary})",
        new_state={
            "platform": listing_in.platform_name,
            "seller": listing_in.seller_name,
            "decision": verif_res.decision,
            "risk_score": verif_res.risk_score,
            "reasons": verif_res.decision_reasons
        }
    )
    db.add(audit)

    db.commit()
    db.refresh(new_listing)
    return new_listing


@router.get("/listings", response_model=List[ListingResponse])
def list_online_listings(
    decision: Optional[str] = Query(None, description="Filter by ALLOW | REVIEW | BLOCK"),
    risk_level: Optional[str] = Query(None, description="Filter by LOW | MEDIUM | HIGH | CRITICAL"),
    platform: Optional[str] = Query(None, description="Filter by platform name"),
    batch_number: Optional[str] = Query(None, description="Filter by batch number"),
    search: Optional[str] = Query(None, description="Search across product, seller, platform, batch"),
    limit: int = Query(50, le=100),
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """
    List online medicine listings with optional decision, platform, batch, and search filters.
    """
    q = db.query(OnlineMedicineListing)

    if decision:
        q = q.filter(OnlineMedicineListing.verification_decision == decision.upper())
    if risk_level:
        q = q.filter(OnlineMedicineListing.risk_level == risk_level.upper())
    if platform:
        q = q.filter(OnlineMedicineListing.platform_name.ilike(f"%{platform}%"))
    if batch_number:
        q = q.filter(OnlineMedicineListing.batch_number.ilike(f"%{batch_number}%"))
    if search:
        s = f"%{search}%"
        q = q.filter(
            (OnlineMedicineListing.claimed_product_name.ilike(s)) |
            (OnlineMedicineListing.seller_name.ilike(s)) |
            (OnlineMedicineListing.platform_name.ilike(s)) |
            (OnlineMedicineListing.batch_number.ilike(s)) |
            (OnlineMedicineListing.listing_reference.ilike(s))
        )

    return q.order_by(OnlineMedicineListing.created_at.desc()).offset(offset).limit(limit).all()


@router.get("/listings/{listing_id}", response_model=ListingResponse)
def get_online_listing(
    listing_id: str,
    db: Session = Depends(get_db)
):
    """
    Retrieve single online listing with full 11-stage audit checks.
    """
    listing = db.query(OnlineMedicineListing).filter(
        (OnlineMedicineListing.id == listing_id) | (OnlineMedicineListing.listing_reference == listing_id)
    ).first()
    if not listing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Online listing not found")
    return listing


@router.post("/listings/{listing_id}/enforce", response_model=ListingResponse)
def enforce_listing_action(
    listing_id: str,
    action_in: ListingEnforceRequest,
    db: Session = Depends(get_db),
    current_user: Optional[dict] = Depends(get_optional_user_payload)
):
    """
    Take enforcement action on an online listing:
    - ISSUE_TAKEDOWN: Issues ISP/domain takedown demand & sets status to TAKEDOWN_REQUESTED
    - CONFIRM_BLOCK: Confirms regulatory block & freezes listing
    - APPROVE_PERMITTED: Overrides to PERMITTED after manual regulatory review
    """
    listing = db.query(OnlineMedicineListing).filter(OnlineMedicineListing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Online listing not found")

    action = action_in.action.upper()
    if action == "ISSUE_TAKEDOWN":
        listing.listing_status = ListingStatusEnum.TAKEDOWN_REQUESTED
        listing.takedown_requested = True
        listing.takedown_requested_at = datetime.now(timezone.utc)
        listing.enforcement_notes = action_in.enforcement_notes or "Formal takedown demand issued to hosting provider."
    elif action == "CONFIRM_BLOCK":
        listing.listing_status = ListingStatusEnum.BLOCKED
        listing.enforcement_notes = action_in.enforcement_notes or "Regulatory block confirmed."
    elif action == "APPROVE_PERMITTED":
        listing.listing_status = ListingStatusEnum.PERMITTED
        listing.verification_decision = ListingDecisionEnum.ALLOW
        listing.enforcement_notes = action_in.enforcement_notes or "Cleared following manual compliance review."
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid action '{action}'")

    if current_user:
        listing.reviewed_by_user_id = current_user.get("sub")

    db.commit()
    db.refresh(listing)
    return listing


@router.get("/summary", response_model=Dict[str, Any])
def get_online_safety_summary(
    db: Session = Depends(get_db)
):
    """
    Provides aggregated surveillance telemetry for the Phase 9 Online Medicine Safety dashboard.
    """
    total = db.query(OnlineMedicineListing).count()
    allowed_count = db.query(OnlineMedicineListing).filter(
        OnlineMedicineListing.verification_decision == ListingDecisionEnum.ALLOW
    ).count()
    review_count = db.query(OnlineMedicineListing).filter(
        OnlineMedicineListing.verification_decision == ListingDecisionEnum.REVIEW
    ).count()
    blocked_count = db.query(OnlineMedicineListing).filter(
        OnlineMedicineListing.verification_decision == ListingDecisionEnum.BLOCK
    ).count()
    takedowns_count = db.query(OnlineMedicineListing).filter(
        OnlineMedicineListing.takedown_requested == True
    ).count()

    return {
        "total_evaluated_listings": total,
        "allowed_count": allowed_count,
        "review_count": review_count,
        "blocked_count": blocked_count,
        "takedowns_issued": takedowns_count,
        "active_compliance_rate": round(allowed_count / total * 100, 1) if total > 0 else 100.0
    }
