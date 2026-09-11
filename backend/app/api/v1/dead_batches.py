"""
Phase 8: Dead Batch Registry API

Provides read-only access to the permanent Dead Batch Registry.
Dead Batch entries are created atomically during destruction certificate finalization
and CANNOT be deleted through ordinary CRUD operations.

Supports:
  - List all dead batches (searchable)
  - Get dead batch by batch_number or batch_id
  - List re-entry incidents (destroyed batches scanned again)

Security:
  - Read endpoints are open (no auth required) — regulatory transparency
  - Registry entries cannot be created, modified, or deleted via this router
"""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.models.dead_batch import DeadBatch
from backend.app.models.verification import VerificationScan, VerificationStatusEnum
from backend.app.schemas.dead_batch import DeadBatchResponse
from backend.app.schemas.verification import VerificationScanResponse

router = APIRouter()


@router.get("", response_model=List[DeadBatchResponse])
def list_dead_batches(
    batch_number: Optional[str] = Query(None, description="Filter by batch number"),
    search: Optional[str] = Query(None, description="Search across batch number, manufacturer, or hash"),
    limit: int = Query(50, le=100),
    offset: int = 0,
    db: Session = Depends(get_db),
):
    """
    List all entries in the Dead Batch Registry.
    Results are ordered by most recently destroyed first.
    Supports search/filter by batch_number, manufacturer name, or certificate hash.
    """
    q = db.query(DeadBatch)
    if batch_number:
        q = q.filter(DeadBatch.batch_number.ilike(f"%{batch_number}%"))
    if search:
        s = f"%{search}%"
        q = q.filter(
            (DeadBatch.batch_number.ilike(s))
            | (DeadBatch.manufacturer_name.ilike(s))
            | (DeadBatch.destruction_cert_hash.ilike(s))
        )
    return q.order_by(DeadBatch.blacklisted_at.desc()).offset(offset).limit(limit).all()


@router.get("/alerts/re-entry-incidents", response_model=List[VerificationScanResponse])
def list_reentry_incidents(
    limit: int = Query(50, le=100),
    db: Session = Depends(get_db),
):
    """
    List all verification scan events where a destroyed batch was scanned again.
    These are possible re-entry / counterfeiting incidents and carry CRITICAL severity.
    """
    scans = (
        db.query(VerificationScan)
        .filter(
            VerificationScan.verification_status
            == VerificationStatusEnum.DEAD_BATCH_REENTRY_DETECTED
        )
        .order_by(VerificationScan.timestamp.desc())
        .limit(limit)
        .all()
    )

    results = []
    for s in scans:
        results.append(
            VerificationScanResponse(
                verification_status=s.verification_status,
                batch_number=s.batch_number,
                brand_name="DESTROYED MEDICINE (DEAD BATCH)",
                generic_name=None,
                manufacturer_name=None,
                is_expired=True,
                is_recalled=True,
                is_dead_batch_reentry=True,
                warning_message=s.alert_details,
                timestamp=s.timestamp,
                scan_id=s.id,
            )
        )
    return results


@router.get("/{batch_identifier}", response_model=DeadBatchResponse)
def get_dead_batch(
    batch_identifier: str,
    db: Session = Depends(get_db),
):
    """
    Retrieve a specific Dead Batch Registry entry.
    Accepts: batch_number, batch_id, or registry_entry_id.
    Returns 404 if not found — batch is NOT in the Dead Batch Registry.
    """
    # Try batch_number first (most common lookup)
    entry = (
        db.query(DeadBatch)
        .filter(
            (DeadBatch.batch_number == batch_identifier)
            | (DeadBatch.batch_id == batch_identifier)
            | (DeadBatch.id == batch_identifier)
        )
        .first()
    )
    if not entry:
        raise HTTPException(
            status_code=404,
            detail=f"Batch '{batch_identifier}' not found in Dead Batch Registry. "
                   "Batch may still be in commercial distribution.",
        )
    return entry
