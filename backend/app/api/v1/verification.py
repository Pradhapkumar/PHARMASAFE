import uuid
from datetime import date, datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from backend.app.core.security import security_bearer, decode_access_token
from backend.app.db.session import get_db
from backend.app.models.batch import Batch, BatchStatusEnum
from backend.app.models.dead_batch import DeadBatch
from backend.app.models.verification import VerificationScan, VerificationStatusEnum
from backend.app.models.audit import AuditLog
from backend.app.models.alert import AlertSeverity, AlertType
from backend.app.schemas.verification import VerificationScanRequest, VerificationScanResponse
from backend.app.services.alert_service import create_alert

router = APIRouter()

@router.post("/scan", response_model=VerificationScanResponse)
def scan_medicine_code(
    scan_req: VerificationScanRequest,
    db: Session = Depends(get_db)
):
    scanned_text = scan_req.scanned_code.strip()
    
    # Extract batch number from full QR payload if formatted as "PHARMASAFE:<batch>:<gtin>"
    batch_num_query = scanned_text
    if ":" in scanned_text:
        parts = scanned_text.split(":")
        if len(parts) >= 2:
            batch_num_query = parts[1]

    scan_id = f"scn_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc)
    today = date.today()

    # 1. CHECK DEAD BATCH REGISTRY (CRITICAL CHECK)
    dead_entry = db.query(DeadBatch).filter(
        (DeadBatch.batch_number == batch_num_query) | (DeadBatch.gtin_barcode == scanned_text)
    ).first()

    if dead_entry:
        # Increment violation attempts and update timestamp
        dead_entry.reentry_attempts_count += 1
        dead_entry.last_reentry_detected_at = now
        
        # Log critical scan
        scan_log = VerificationScan(
            id=scan_id,
            scanned_code=scan_req.scanned_code,
            code_type=scan_req.code_type,
            batch_id=dead_entry.batch_id,
            batch_number=dead_entry.batch_number,
            verification_status=VerificationStatusEnum.DEAD_BATCH_REENTRY_DETECTED,
            is_critical_alert=True,
            alert_details=f"CRITICAL RE-ENTRY ALERT: Batch {dead_entry.batch_number} was officially DESTROYED (Cert: {dead_entry.destruction_cert_hash[:16]}...) and re-entered commerce.",
            latitude=scan_req.latitude,
            longitude=scan_req.longitude,
            device_info=scan_req.device_info,
            timestamp=now
        )
        db.add(scan_log)

        # Inscribe Critical Incident in Audit Trail
        audit = AuditLog(
            id=f"aud_{uuid.uuid4().hex[:12]}",
            action="DEAD_BATCH_REENTRY_DETECTED",
            entity_type="BATCH",
            entity_id=dead_entry.batch_id,
            details=f"CRITICAL SECURITY ALERT: Destroyed batch {dead_entry.batch_number} scanned at lat:{scan_req.latitude}, lon:{scan_req.longitude}. Total reentry attempts: {dead_entry.reentry_attempts_count}."
        )
        db.add(audit)
        db.commit()

        return VerificationScanResponse(
            verification_status=VerificationStatusEnum.DEAD_BATCH_REENTRY_DETECTED,
            batch_number=dead_entry.batch_number,
            brand_name="DESTROYED MEDICINE (DEAD BATCH)",
            manufacturer_name=dead_entry.manufacturer_name,
            is_expired=True,
            is_recalled=True,
            is_dead_batch_reentry=True,
            warning_message="CRITICAL DANGER: This batch was officially destroyed and logged in the Dead Batch Registry. Do NOT dispense or consume.",
            timestamp=now,
            scan_id=scan_id
        )

    # 2. CHECK ACTIVE/EXISTING BATCHES
    batch = db.query(Batch).filter(
        (Batch.batch_number == batch_num_query) | (Batch.gtin_barcode == scanned_text)
    ).first()

    # 2a. DESTROYED batch that may not be in Dead Batch Registry (edge case)
    if batch and batch.status in [BatchStatusEnum.DESTROYED, BatchStatusEnum.DEAD_BATCH]:
        # Create critical re-entry alert
        create_alert(
            db=db,
            alert_type=AlertType.DEAD_BATCH_REENTRY,
            severity=AlertSeverity.CRITICAL,
            title=f"POSSIBLE RE-ENTRY: Batch {batch.batch_number} (DESTROYED)",
            message=(
                f"CRITICAL: Destroyed batch {batch.batch_number} scanned for verification. "
                f"Batch status: {batch.status.value}. SALE BLOCKED. Possible re-entry / counterfeiting incident. "
                f"Immediate review required."
            ),
            entity_type="BATCH",
            entity_id=batch.id,
            auto_flush=True,
        )

        scan_log = VerificationScan(
            id=scan_id,
            scanned_code=scan_req.scanned_code,
            code_type=scan_req.code_type,
            batch_id=batch.id,
            batch_number=batch.batch_number,
            verification_status=VerificationStatusEnum.DEAD_BATCH_REENTRY_DETECTED,
            is_critical_alert=True,
            alert_details=(
                f"CRITICAL RE-ENTRY ALERT: Batch {batch.batch_number} has status {batch.status.value}. "
                f"Permanently non-sellable. Possible re-entry or counterfeit attempt."
            ),
            latitude=scan_req.latitude,
            longitude=scan_req.longitude,
            device_info=scan_req.device_info,
            timestamp=now,
        )
        db.add(scan_log)

        audit = AuditLog(
            id=f"aud_{uuid.uuid4().hex[:12]}",
            action="DESTROYED_BATCH_REENTRY_ATTEMPT",
            entity_type="BATCH",
            entity_id=batch.id,
            details=(
                f"CRITICAL: Destroyed batch {batch.batch_number} scanned. "
                f"Status: {batch.status.value}. Possible re-entry attempt detected."
            ),
        )
        db.add(audit)
        db.commit()

        return VerificationScanResponse(
            verification_status=VerificationStatusEnum.DEAD_BATCH_REENTRY_DETECTED,
            batch_number=batch.batch_number,
            brand_name=f"DESTROYED MEDICINE ({batch.status.value})",
            manufacturer_name=batch.manufacturer_org.name if batch.manufacturer_org else "Unknown",
            is_expired=True,
            is_recalled=True,
            is_dead_batch_reentry=True,
            warning_message=(
                f"CRITICAL DANGER: Batch {batch.batch_number} is DESTROYED. "
                f"Do NOT dispense. SALE BLOCKED. Possible RE-ENTRY HIGH-RISK ACTIVITY — REVIEW REQUIRED."
            ),
            timestamp=now,
            scan_id=scan_id,
        )

    if not batch:
        scan_log = VerificationScan(
            id=scan_id,
            scanned_code=scan_req.scanned_code,
            code_type=scan_req.code_type,
            verification_status=VerificationStatusEnum.UNKNOWN_NOT_FOUND,
            is_critical_alert=True,
            alert_details="Unregistered or counterfeit barcode scanned.",
            latitude=scan_req.latitude,
            longitude=scan_req.longitude,
            device_info=scan_req.device_info,
            timestamp=now
        )
        db.add(scan_log)
        db.commit()

        return VerificationScanResponse(
            verification_status=VerificationStatusEnum.UNKNOWN_NOT_FOUND,
            batch_number=None,
            is_expired=False,
            is_recalled=False,
            is_dead_batch_reentry=False,
            warning_message="WARNING: Code not recognized in the PharmaSafe National Registry. Possible counterfeit.",
            timestamp=now,
            scan_id=scan_id
        )

    medicine = batch.medicine
    is_expired = batch.expiry_date < today
    is_recalled = batch.is_recalled or batch.status == BatchStatusEnum.RECALLED

    if is_recalled:
        status_enum = VerificationStatusEnum.RECALLED
        warning = f"RECALL WARNING: This batch was recalled by {batch.manufacturer_org.name if batch.manufacturer_org else 'manufacturer'}. Reason: {batch.recall_reason or 'Safety advisory'}."
    elif is_expired:
        status_enum = VerificationStatusEnum.EXPIRED
        warning = f"EXPIRY WARNING: Batch expired on {batch.expiry_date}. Must be moved to reverse logistics."
    elif batch.status == BatchStatusEnum.FLAGGED_SUSPICIOUS:
        status_enum = VerificationStatusEnum.FLAGGED_SUSPICIOUS
        warning = "SUSPICIOUS BATCH: High supply-chain anomaly risk score detected."
    else:
        status_enum = VerificationStatusEnum.AUTHENTIC
        warning = None

    scan_log = VerificationScan(
        id=scan_id,
        scanned_code=scan_req.scanned_code,
        code_type=scan_req.code_type,
        batch_id=batch.id,
        batch_number=batch.batch_number,
        verification_status=status_enum,
        is_critical_alert=(is_expired or is_recalled),
        alert_details=warning,
        latitude=scan_req.latitude,
        longitude=scan_req.longitude,
        device_info=scan_req.device_info,
        timestamp=now
    )
    db.add(scan_log)
    db.commit()

    return VerificationScanResponse(
        verification_status=status_enum,
        batch_number=batch.batch_number,
        brand_name=medicine.brand_name if medicine else "Unknown Medicine",
        generic_name=medicine.generic_name if medicine else None,
        manufacturer_name=batch.manufacturer_org.name if batch.manufacturer_org else "Unknown Manufacturer",
        is_expired=is_expired,
        is_recalled=is_recalled,
        is_dead_batch_reentry=False,
        warning_message=warning,
        timestamp=now,
        scan_id=scan_id
    )
