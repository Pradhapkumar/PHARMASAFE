"""
Phase 9: Online Medicine Safety & Listing Verifier Service.

Executes the deterministic 11-stage verification pipeline:
1.  Seller Verification
2.  Product Verification
3.  Batch Verification
4.  Expiry Check
5.  Recall Check
6.  Lifecycle Check
7.  Dead Batch Check
8.  Ownership / Custody Check
9.  Quantity Consistency Check
10. Duplicate Listing Check
11. Certificate / QR Reuse Check

Outputs deterministic decision: ALLOW, REVIEW, or BLOCK.
"""
from datetime import date
from typing import Dict, List, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.app.models.user import Organization, RoleEnum
from backend.app.models.medicine import Medicine
from backend.app.models.batch import Batch, BatchStatusEnum
from backend.app.models.inventory import Inventory
from backend.app.models.dead_batch import DeadBatch
from backend.app.models.destruction import DestructionRecord
from backend.app.models.online_safety import (
    OnlineMedicineListing, ListingDecisionEnum, ListingRiskLevelEnum, ListingStatusEnum
)
from backend.app.schemas.online_safety import (
    ListingVerificationRequest, ListingVerificationResponse, StageCheckResult
)


class OnlineSafetyVerifier:
    """
    Deterministic engine for online medicine listing surveillance and verification.
    """

    @classmethod
    def verify_listing(cls, db: Session, req: ListingVerificationRequest) -> ListingVerificationResponse:
        stage_checks: Dict[str, StageCheckResult] = {}
        decision_reasons: List[str] = []
        
        batch_matched = False
        seller_matched = False
        product_matched = False
        dead_batch_detected = False

        # Pre-query entities
        # 1. Organization / Seller
        seller_org: Optional[Organization] = None
        if req.seller_org_id:
            seller_org = db.query(Organization).filter(Organization.id == req.seller_org_id).first()
        elif req.seller_license_number:
            seller_org = db.query(Organization).filter(Organization.license_number == req.seller_license_number).first()
        elif req.seller_name:
            seller_org = db.query(Organization).filter(
                func.lower(Organization.name) == req.seller_name.strip().lower()
            ).first()

        if seller_org:
            seller_matched = True

        # 2. Batch
        batch: Optional[Batch] = None
        if req.batch_number:
            batch = db.query(Batch).filter(
                func.lower(Batch.batch_number) == req.batch_number.strip().lower()
            ).first()

        if batch:
            batch_matched = True

        # 3. Medicine
        matched_med: Optional[Medicine] = None
        if batch and batch.medicine:
            matched_med = batch.medicine
        elif req.claimed_product_name:
            # Search by brand name
            matched_med = db.query(Medicine).filter(
                func.lower(Medicine.brand_name) == req.claimed_product_name.strip().lower()
            ).first()
            if not matched_med:
                matched_med = db.query(Medicine).filter(
                    func.lower(Medicine.generic_name) == req.claimed_product_name.strip().lower()
                ).first()

        if matched_med:
            product_matched = True

        # =========================================================================
        # STAGE 1: SELLER VERIFICATION
        # =========================================================================
        illicit_keywords = ["telegram", "darknet", "directrx", "anon", "blackmarket", "graymarket", "silkroad"]
        platform_lower = req.platform_name.lower()
        seller_lower = req.seller_name.lower()
        is_illicit_channel = any(kw in platform_lower or kw in seller_lower for kw in illicit_keywords)

        if is_illicit_channel:
            stage_checks["seller_verification"] = StageCheckResult(
                stage="seller_verification",
                status="FAILED",
                details=f"Illicit or unmonitored gray-market channel detected ({req.platform_name} / {req.seller_name}).",
                metadata={"is_illicit_channel": True}
            )
            decision_reasons.append("SELLER_ILLICIT_PLATFORM: Channel is a known illicit or unmonitored peer-to-peer venue.")
        elif seller_org:
            if not seller_org.is_verified:
                stage_checks["seller_verification"] = StageCheckResult(
                    stage="seller_verification",
                    status="FAILED",
                    details=f"Seller organization '{seller_org.name}' ({seller_org.license_number}) license is NOT verified or suspended.",
                    metadata={"org_id": seller_org.id, "verified": False}
                )
                decision_reasons.append("SELLER_LICENSE_SUSPENDED: Claimed organization license is unverified or suspended.")
            elif seller_org.role_type == RoleEnum.PHARMACY:
                stage_checks["seller_verification"] = StageCheckResult(
                    stage="seller_verification",
                    status="PASSED",
                    details=f"Verified licensed retail pharmacy '{seller_org.name}' (License: {seller_org.license_number}).",
                    metadata={"org_id": seller_org.id, "role": seller_org.role_type.value}
                )
            elif seller_org.role_type in [RoleEnum.MANUFACTURER, RoleEnum.DISTRIBUTOR]:
                stage_checks["seller_verification"] = StageCheckResult(
                    stage="seller_verification",
                    status="WARNING",
                    details=f"Seller '{seller_org.name}' is registered as {seller_org.role_type.value}, not a retail pharmacy.",
                    metadata={"org_id": seller_org.id, "role": seller_org.role_type.value}
                )
                decision_reasons.append(f"SELLER_NON_RETAIL_ROLE: Seller is registered as {seller_org.role_type.value} rather than retail pharmacy.")
            else:
                stage_checks["seller_verification"] = StageCheckResult(
                    stage="seller_verification",
                    status="FAILED",
                    details=f"Organization role {seller_org.role_type.value} is unauthorized for medicine commercial sales.",
                    metadata={"org_id": seller_org.id}
                )
                decision_reasons.append("SELLER_ROLE_UNAUTHORIZED: Entity role is not permitted to dispense medicines.")
        else:
            stage_checks["seller_verification"] = StageCheckResult(
                stage="seller_verification",
                status="WARNING",
                details=f"Seller '{req.seller_name}' is not a known registered organization in PharmaSafe.",
                metadata={"seller_name": req.seller_name}
            )
            decision_reasons.append("SELLER_UNREGISTERED: Seller identity is unverified in PharmaSafe regulatory database.")

        # =========================================================================
        # STAGE 2: PRODUCT VERIFICATION
        # =========================================================================
        if batch and batch.medicine:
            med = batch.medicine
            claimed_lower = req.claimed_product_name.strip().lower()
            brand_lower = med.brand_name.strip().lower()
            generic_lower = med.generic_name.strip().lower()
            
            # Allow partial matching if brand or generic matches
            if brand_lower in claimed_lower or claimed_lower in brand_lower or generic_lower in claimed_lower:
                stage_checks["product_verification"] = StageCheckResult(
                    stage="product_verification",
                    status="PASSED",
                    details=f"Claimed product matches batch medicine '{med.brand_name}' ({med.generic_name} {med.strength}).",
                    metadata={"medicine_id": med.id, "brand_name": med.brand_name}
                )
            else:
                stage_checks["product_verification"] = StageCheckResult(
                    stage="product_verification",
                    status="FAILED",
                    details=f"Product mismatch! Listing claims '{req.claimed_product_name}' but batch {batch.batch_number} is registered as '{med.brand_name}' ({med.generic_name}).",
                    metadata={"claimed": req.claimed_product_name, "registered": med.brand_name}
                )
                decision_reasons.append(f"PRODUCT_BATCH_MISMATCH: Claimed product '{req.claimed_product_name}' does not match registered batch product '{med.brand_name}'.")
        elif matched_med:
            stage_checks["product_verification"] = StageCheckResult(
                stage="product_verification",
                status="PASSED",
                details=f"Product found in national catalogue: '{matched_med.brand_name}' ({matched_med.generic_name}).",
                metadata={"medicine_id": matched_med.id}
            )
        else:
            stage_checks["product_verification"] = StageCheckResult(
                stage="product_verification",
                status="WARNING",
                details=f"Claimed product '{req.claimed_product_name}' was not found in active medicine catalogue.",
                metadata={"claimed": req.claimed_product_name}
            )
            decision_reasons.append("PRODUCT_UNREGISTERED_IN_CATALOGUE: Product name not recognized in authorized medicine registry.")

        # =========================================================================
        # STAGE 3: BATCH REGISTRY VERIFICATION
        # =========================================================================
        if not req.batch_number:
            stage_checks["batch_verification"] = StageCheckResult(
                stage="batch_verification",
                status="FAILED",
                details="No batch number provided in online listing.",
                metadata=None
            )
            decision_reasons.append("MISSING_BATCH_NUMBER: Online medicine listing lacks mandatory lot/batch identification.")
        elif batch:
            stage_checks["batch_verification"] = StageCheckResult(
                stage="batch_verification",
                status="PASSED",
                details=f"Authentic batch '{batch.batch_number}' verified against manufacturer registry ({batch.manufacturer_org.name if batch.manufacturer_org else 'Verified Mfg'}).",
                metadata={"batch_id": batch.id, "batch_number": batch.batch_number}
            )
        else:
            stage_checks["batch_verification"] = StageCheckResult(
                stage="batch_verification",
                status="FAILED",
                details=f"Batch '{req.batch_number}' does NOT exist in PharmaSafe sovereign batch registry. Potential counterfeit.",
                metadata={"batch_number": req.batch_number}
            )
            decision_reasons.append("UNREGISTERED_BATCH: Batch number not found in authorized manufacturing records (counterfeit threat).")

        # =========================================================================
        # STAGE 4: EXPIRY CHECK
        # =========================================================================
        today = date.today()
        if batch:
            if batch.expiry_date < today:
                stage_checks["expiry_check"] = StageCheckResult(
                    stage="expiry_check",
                    status="FAILED",
                    details=f"Batch expired on {batch.expiry_date.isoformat()} ({(today - batch.expiry_date).days} days ago). Illegal to sell.",
                    metadata={"expiry_date": batch.expiry_date.isoformat(), "is_expired": True}
                )
                decision_reasons.append(f"BATCH_EXPIRED: Batch expired on {batch.expiry_date.isoformat()}. Resale is strictly prohibited.")
            elif (batch.expiry_date - today).days <= 30:
                stage_checks["expiry_check"] = StageCheckResult(
                    stage="expiry_check",
                    status="WARNING",
                    details=f"Batch expires soon on {batch.expiry_date.isoformat()} ({(batch.expiry_date - today).days} days remaining).",
                    metadata={"expiry_date": batch.expiry_date.isoformat(), "days_remaining": (batch.expiry_date - today).days}
                )
                decision_reasons.append(f"NEAR_EXPIRY_WARNING: Batch expires within 30 days ({batch.expiry_date.isoformat()}).")
            else:
                stage_checks["expiry_check"] = StageCheckResult(
                    stage="expiry_check",
                    status="PASSED",
                    details=f"Batch is unexpired (Valid until {batch.expiry_date.isoformat()}).",
                    metadata={"expiry_date": batch.expiry_date.isoformat()}
                )
        else:
            stage_checks["expiry_check"] = StageCheckResult(
                stage="expiry_check",
                status="WARNING",
                details="Expiry status unverifiable because batch is unregistered.",
                metadata=None
            )

        # =========================================================================
        # STAGE 5: RECALL CHECK
        # =========================================================================
        if batch:
            if batch.is_recalled or batch.status == BatchStatusEnum.RECALLED:
                stage_checks["recall_check"] = StageCheckResult(
                    stage="recall_check",
                    status="FAILED",
                    details=f"Batch is under mandatory regulatory recall. Reason: '{batch.recall_reason or 'Public Safety Order'}'.",
                    metadata={"is_recalled": True, "reason": batch.recall_reason}
                )
                decision_reasons.append(f"BATCH_RECALLED: Batch is subject to an active regulatory recall ({batch.recall_reason or 'Safety alert'}).")
            else:
                stage_checks["recall_check"] = StageCheckResult(
                    stage="recall_check",
                    status="PASSED",
                    details="Batch has no active regulatory recalls.",
                    metadata={"is_recalled": False}
                )
        else:
            stage_checks["recall_check"] = StageCheckResult(
                stage="recall_check",
                status="WARNING",
                details="Recall status unverifiable because batch is unregistered.",
                metadata=None
            )

        # =========================================================================
        # STAGE 6: LIFECYCLE CHECK
        # =========================================================================
        if batch:
            terminal_reverse_states = [
                BatchStatusEnum.DEAD_BATCH,
                BatchStatusEnum.DESTROYED,
                BatchStatusEnum.DISPOSED,
                BatchStatusEnum.RECEIVED_AT_DISPOSAL,
                BatchStatusEnum.RETURN_IN_TRANSIT,
                BatchStatusEnum.RETURN_INITIATED,
                BatchStatusEnum.FLAGGED_SUSPICIOUS
            ]
            if batch.status in terminal_reverse_states:
                stage_checks["lifecycle_check"] = StageCheckResult(
                    stage="lifecycle_check",
                    status="FAILED",
                    details=f"Batch is in illicit status for commerce: '{batch.status.value}'. Reverse supply or destroyed state.",
                    metadata={"status": batch.status.value}
                )
                decision_reasons.append(f"INVALID_LIFECYCLE_STATUS: Batch is in terminal/reverse logistics status '{batch.status.value}'.")
            elif batch.status in [BatchStatusEnum.MANUFACTURED, BatchStatusEnum.IN_DISTRIBUTION]:
                stage_checks["lifecycle_check"] = StageCheckResult(
                    stage="lifecycle_check",
                    status="WARNING",
                    details=f"Batch is still at upstream supply stage '{batch.status.value}', not yet confirmed at retail dispensary.",
                    metadata={"status": batch.status.value}
                )
                decision_reasons.append(f"UPSTREAM_SUPPLY_STAGE: Batch is in '{batch.status.value}' stage, has not completed pharmacy receiving.")
            elif batch.status == BatchStatusEnum.DISPENSED:
                stage_checks["lifecycle_check"] = StageCheckResult(
                    stage="lifecycle_check",
                    status="WARNING",
                    details="Batch is flagged as DISPENSED in point-of-sale records.",
                    metadata={"status": batch.status.value}
                )
                decision_reasons.append("BATCH_ALREADY_DISPENSED: Batch status indicates previous point-of-sale dispensation.")
            else:
                stage_checks["lifecycle_check"] = StageCheckResult(
                    stage="lifecycle_check",
                    status="PASSED",
                    details=f"Batch is in valid forward dispensary status '{batch.status.value}'.",
                    metadata={"status": batch.status.value}
                )
        else:
            stage_checks["lifecycle_check"] = StageCheckResult(
                stage="lifecycle_check",
                status="WARNING",
                details="Lifecycle check unverifiable for unregistered batch.",
                metadata=None
            )

        # =========================================================================
        # STAGE 7: DEAD BATCH CHECK (Immediate fatal block)
        # =========================================================================
        dead_entry: Optional[DeadBatch] = None
        if batch:
            dead_entry = db.query(DeadBatch).filter(
                (DeadBatch.batch_id == batch.id) | (DeadBatch.batch_number == batch.batch_number)
            ).first()
        elif req.batch_number:
            dead_entry = db.query(DeadBatch).filter(
                DeadBatch.batch_number == req.batch_number.strip()
            ).first()

        if dead_entry:
            dead_batch_detected = True
            stage_checks["dead_batch_check"] = StageCheckResult(
                stage="dead_batch_check",
                status="FAILED",
                details=f"CRITICAL: Batch '{dead_entry.batch_number}' is inscribed in Dead Batch Registry (Destroyed: {dead_entry.destroyed_at.isoformat()}). SHA-256: {dead_entry.destruction_cert_hash[:16]}...",
                metadata={"dead_batch_id": dead_entry.id, "cert_hash": dead_entry.destruction_cert_hash}
            )
            decision_reasons.append("DEAD_BATCH_REGISTRY_MATCH: Batch was certified destroyed and permanently blacklisted in Dead Batch Registry.")
        else:
            stage_checks["dead_batch_check"] = StageCheckResult(
                stage="dead_batch_check",
                status="PASSED",
                details="Batch is clean — not found in sovereign Dead Batch Registry.",
                metadata={"is_dead_batch": False}
            )

        # =========================================================================
        # STAGE 8: OWNERSHIP / CUSTODY CHECK
        # =========================================================================
        if batch and seller_org:
            # Check custody pointer
            is_custodian = (batch.current_custodian_id == seller_org.id)
            inv = db.query(Inventory).filter(
                Inventory.organization_id == seller_org.id,
                Inventory.batch_id == batch.id
            ).first()

            if is_custodian and batch.current_quantity > 0:
                inv_qty = inv.quantity_available if (inv and inv.quantity_available > 0) else batch.current_quantity
                stage_checks["custody_check"] = StageCheckResult(
                    stage="custody_check",
                    status="PASSED",
                    details=f"Seller '{seller_org.name}' is verified current custodian with confirmed stock ({inv_qty} units).",
                    metadata={"custodian_id": batch.current_custodian_id, "inventory_available": inv_qty}
                )
            elif inv and inv.quantity_available > 0:
                stage_checks["custody_check"] = StageCheckResult(
                    stage="custody_check",
                    status="WARNING",
                    details=f"Seller '{seller_org.name}' holds inventory ({inv.quantity_available} units) but is not marked as current custodian.",
                    metadata={"custodian_id": batch.current_custodian_id, "inventory_available": inv.quantity_available}
                )
                decision_reasons.append("CUSTODY_POINTER_MISMATCH: Organization holds inventory record but master batch custodian pointer differs.")
            else:
                stage_checks["custody_check"] = StageCheckResult(
                    stage="custody_check",
                    status="FAILED",
                    details=f"Seller '{seller_org.name}' does NOT have physical custody or confirmed inventory for this batch in PharmaSafe.",
                    metadata={"custodian_id": batch.current_custodian_id}
                )
                decision_reasons.append("UNAUTHORIZED_CUSTODIAN: Seller has no recorded physical inventory or custody transfer for this batch.")
        elif batch:
            stage_checks["custody_check"] = StageCheckResult(
                stage="custody_check",
                status="WARNING",
                details=f"Seller is unverified. Current legitimate custodian in registry is '{batch.current_custodian.name if batch.current_custodian else 'Unknown'}'.",
                metadata={"registered_custodian": batch.current_custodian_id}
            )
            decision_reasons.append("CUSTODY_UNVERIFIABLE: Cannot match unverified merchant to batch's authorized custody chain.")
        else:
            stage_checks["custody_check"] = StageCheckResult(
                stage="custody_check",
                status="WARNING",
                details="Custody unverifiable for unregistered batch.",
                metadata=None
            )

        # =========================================================================
        # STAGE 9: QUANTITY CONSISTENCY CHECK
        # =========================================================================
        if batch:
            if batch.current_quantity <= 0:
                stage_checks["quantity_check"] = StageCheckResult(
                    stage="quantity_check",
                    status="FAILED",
                    details="Batch has 0 current quantity remaining in system. Listing represents phantom/diverted supply.",
                    metadata={"batch_current_quantity": batch.current_quantity}
                )
                decision_reasons.append("ZERO_REMAINING_QUANTITY: Batch physical quantity is depleted (0 available).")
            elif req.offered_quantity:
                # Check against seller inventory if known, else batch current_quantity
                available_limit = batch.current_quantity
                if seller_org:
                    inv = db.query(Inventory).filter(
                        Inventory.organization_id == seller_org.id,
                        Inventory.batch_id == batch.id
                    ).first()
                    if inv:
                        available_limit = inv.quantity_available

                if req.offered_quantity > available_limit:
                    stage_checks["quantity_check"] = StageCheckResult(
                        stage="quantity_check",
                        status="FAILED",
                        details=f"Offered quantity ({req.offered_quantity} units) exceeds available physical inventory ({available_limit} units). Ghost inventory.",
                        metadata={"offered": req.offered_quantity, "available": available_limit}
                    )
                    decision_reasons.append(f"EXCESS_OFFERED_QUANTITY: Seller offers {req.offered_quantity} units but only {available_limit} units exist.")
                else:
                    stage_checks["quantity_check"] = StageCheckResult(
                        stage="quantity_check",
                        status="PASSED",
                        details=f"Offered quantity ({req.offered_quantity} units) is within confirmed inventory limits ({available_limit} units).",
                        metadata={"offered": req.offered_quantity, "available": available_limit}
                    )
            else:
                stage_checks["quantity_check"] = StageCheckResult(
                    stage="quantity_check",
                    status="PASSED",
                    details=f"Batch has positive available stock ({batch.current_quantity} units).",
                    metadata={"batch_current_quantity": batch.current_quantity}
                )
        else:
            stage_checks["quantity_check"] = StageCheckResult(
                stage="quantity_check",
                status="WARNING",
                details="Quantity unverifiable for unregistered batch.",
                metadata=None
            )

        # =========================================================================
        # STAGE 10: DUPLICATE LISTING CHECK
        # =========================================================================
        if req.batch_number:
            active_duplicates = db.query(OnlineMedicineListing).filter(
                OnlineMedicineListing.batch_number == req.batch_number.strip(),
                OnlineMedicineListing.listing_status.in_([
                    ListingStatusEnum.ACTIVE, ListingStatusEnum.PENDING_REVIEW, ListingStatusEnum.PERMITTED
                ])
            ).all()

            if active_duplicates:
                # Check for cross-seller collisions
                other_sellers = [
                    d for d in active_duplicates 
                    if d.seller_name.strip().lower() != req.seller_name.strip().lower()
                ]
                if other_sellers:
                    stage_checks["duplicate_check"] = StageCheckResult(
                        stage="duplicate_check",
                        status="FAILED",
                        details=f"Batch is simultaneously active under multiple distinct sellers ({', '.join(set(d.seller_name for d in other_sellers))}). Cross-seller collision.",
                        metadata={"duplicate_count": len(active_duplicates), "other_sellers": [d.seller_name for d in other_sellers]}
                    )
                    decision_reasons.append(f"CROSS_SELLER_COLLISION: Batch {req.batch_number} is already listed by another distinct seller.")
                else:
                    stage_checks["duplicate_check"] = StageCheckResult(
                        stage="duplicate_check",
                        status="WARNING",
                        details=f"Seller '{req.seller_name}' already has {len(active_duplicates)} active listing(s) for this batch.",
                        metadata={"duplicate_count": len(active_duplicates)}
                    )
                    decision_reasons.append(f"DUPLICATE_ACTIVE_LISTING: Duplicate active listing by same merchant for batch {req.batch_number}.")
            else:
                stage_checks["duplicate_check"] = StageCheckResult(
                    stage="duplicate_check",
                    status="PASSED",
                    details="No conflicting or duplicate active online listings detected for this batch.",
                    metadata={"active_duplicates": 0}
                )
        else:
            stage_checks["duplicate_check"] = StageCheckResult(
                stage="duplicate_check",
                status="PASSED",
                details="Duplicate check skipped (no batch number).",
                metadata=None
            )

        # =========================================================================
        # STAGE 11: CERTIFICATE / QR REUSE CHECK
        # =========================================================================
        qr_cert_failed = False
        cert_theft_detected = False
        qr_mismatch_detected = False

        # 1. Certificate Hash Check
        if req.claimed_certificate_hash:
            dest_rec = db.query(DestructionRecord).filter(
                DestructionRecord.certificate_sha256_hash == req.claimed_certificate_hash.strip()
            ).first()
            if dest_rec:
                cert_theft_detected = True
                qr_cert_failed = True
                decision_reasons.append("DESTRUCTION_CERTIFICATE_THEFT: Claimed certificate SHA-256 hash belongs to a confirmed destruction record!")
            else:
                decision_reasons.append("UNRECOGNIZED_CERTIFICATE_HASH: Provided certificate hash does not match known authoritative certificates.")

        # 2. QR Signature Check
        if req.claimed_qr_payload and batch:
            if batch.qr_payload and batch.qr_payload.strip() != req.claimed_qr_payload.strip():
                qr_mismatch_detected = True
                qr_cert_failed = True
                decision_reasons.append("QR_SIGNATURE_MISMATCH: Claimed cryptographic QR payload does not match authentic manufacturer batch signature.")

        if cert_theft_detected:
            stage_checks["certificate_qr_check"] = StageCheckResult(
                stage="certificate_qr_check",
                status="FAILED",
                details="CRITICAL FRAUD: Claimed certificate SHA-256 hash is stolen from an authoritative DestructionRecord!",
                metadata={"cert_theft": True}
            )
        elif qr_mismatch_detected:
            stage_checks["certificate_qr_check"] = StageCheckResult(
                stage="certificate_qr_check",
                status="FAILED",
                details="Cryptographic QR signature mismatch detected. Potential clone or counterfeit QR.",
                metadata={"qr_mismatch": True}
            )
        elif req.claimed_certificate_hash or req.claimed_qr_payload:
            stage_checks["certificate_qr_check"] = StageCheckResult(
                stage="certificate_qr_check",
                status="PASSED" if not qr_cert_failed else "WARNING",
                details="Cryptographic tokens inspected and validated against registry.",
                metadata={"has_qr": bool(req.claimed_qr_payload), "has_cert": bool(req.claimed_certificate_hash)}
            )
        else:
            stage_checks["certificate_qr_check"] = StageCheckResult(
                stage="certificate_qr_check",
                status="PASSED",
                details="Standard commercial listing (no cryptographic certificate attachment required).",
                metadata={"claimed_tokens": False}
            )

        # =========================================================================
        # DETERMINISTIC DECISION EVALUATION
        # =========================================================================
        failed_stages = [k for k, v in stage_checks.items() if v.status == "FAILED"]
        warning_stages = [k for k, v in stage_checks.items() if v.status == "WARNING"]

        # Critical Fatal Blockers
        critical_fatal_stages = [
            "dead_batch_check",
            "expiry_check",
            "recall_check",
            "lifecycle_check",
            "batch_verification",
            "product_verification"
        ]
        has_fatal_stage = any(stage in failed_stages for stage in critical_fatal_stages) or cert_theft_detected or is_illicit_channel

        if has_fatal_stage or len(failed_stages) > 0:
            decision = ListingDecisionEnum.BLOCK.value
            if dead_batch_detected or cert_theft_detected or is_illicit_channel:
                risk_level = ListingRiskLevelEnum.CRITICAL.value
                risk_score = 1.0
            else:
                risk_level = ListingRiskLevelEnum.HIGH.value
                risk_score = round(min(0.98, 0.85 + 0.03 * len(failed_stages)), 2)
            summary = f"BLOCKED: Listing violates critical safety policies ({len(failed_stages)} failed checks). Immediate takedown required."
        elif len(warning_stages) > 0:
            decision = ListingDecisionEnum.REVIEW.value
            risk_level = ListingRiskLevelEnum.MEDIUM.value if len(warning_stages) <= 2 else ListingRiskLevelEnum.HIGH.value
            risk_score = round(min(0.75, 0.35 + 0.10 * len(warning_stages)), 2)
            summary = f"REVIEW REQUIRED: Listing exhibits {len(warning_stages)} anomaly warning(s). Quarantine pending merchant verification."
        else:
            decision = ListingDecisionEnum.ALLOW.value
            risk_level = ListingRiskLevelEnum.LOW.value
            risk_score = 0.05
            summary = "ALLOWED: Authenticated pharmacy merchant, genuine registered batch, confirmed custody, and valid inventory."

        return ListingVerificationResponse(
            decision=decision,
            risk_level=risk_level,
            risk_score=risk_score,
            summary=summary,
            decision_reasons=decision_reasons,
            stage_checks=stage_checks,
            batch_matched=batch_matched,
            seller_matched=seller_matched,
            product_matched=product_matched,
            dead_batch_detected=dead_batch_detected
        )
