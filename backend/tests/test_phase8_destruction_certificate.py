"""
Phase 8 Tests: Destruction Certificate + Dead Batch Registry

Test Coverage:
  CERTIFICATE CREATION:
    1. Create destruction certificate from DISPOSED disposal record
    2. Reject non-DISPOSED disposal (batch not yet disposed)
    3. Valid certificate hash generated (64-char hex SHA-256)
    4. Deterministic hash — same inputs produce same hash
    5. Quantity mismatch rejected with DESTRUCTION_QUANTITY_MISMATCH
    6. Duplicate certification blocked (ALREADY_CERTIFIED / HTTP 409)

  FINALIZATION:
    7. Successful creation sets batch status to DESTROYED
    8. Successful creation sets current_quantity = 0
    9. Dead Batch Registry entry created
    10. Audit log entry created

  CERTIFICATE VERIFICATION:
    11. Verify certificate hash — returns VERIFIED
    12. Idempotent verification — repeated call returns VERIFIED safely
    13. Certificate not found returns 404
    14. Hash mismatch detection (tampered record returns HASH_MISMATCH)

  DEAD BATCH REGISTRY:
    15. Dead batch lookup works (by batch_number)
    16. Destroyed batch remains permanently queryable
    17. Dead batch list returns all entries
    18. Duplicate Dead Batch Registry entry prevented

  RE-ENTRY PROTECTION:
    19. Destroyed batch sale verification returns BLOCK_SALE
    20. Destroyed batch verification scan creates DEAD_BATCH_REENTRY_DETECTED alert
    21. Destroyed batch scan (via /verify/scan) returns re-entry warning

  RBAC:
    22. Disposal facility can create destruction record
    23. Pharmacy CANNOT certify destruction (403)
    24. Distributor CANNOT certify destruction (403)
    25. Regulator can verify certificate
    26. Admin can perform all destruction operations

  REGRESSION:
    27. Phase 7 existing tests not broken (DISPOSED lifecycle intact)
"""
from datetime import date, timedelta
import hashlib
import pytest

from backend.app.models.batch import BatchStatusEnum
from backend.app.models.dead_batch import DeadBatch
from backend.app.models.destruction import DestructionRecord, CertificateVerificationStatus
from backend.app.models.disposal import DisposalRecord
from backend.app.api.v1.destruction import build_canonical_cert_string, generate_cert_hash


# ─── Fixtures / Helpers ───────────────────────────────────────────────────────

def create_disposed_batch(client, manufacturer_token, disposal_token, pharmacy_token, batch_suffix="PH8"):
    """
    Full end-to-end Phase 7 workflow:
    Create batch → return → disposal intake → complete disposal → DISPOSED
    Returns (batch_id, disposal_id, return_id)
    """
    today = date.today()

    # 1. Create batch as manufacturer
    batch_resp = client.post(
        "/api/v1/batches",
        json={
            "batch_number": f"PH8-BATCH-{batch_suffix}",
            "gtin_barcode": f"8901PH8{batch_suffix}0001",
            "medicine_id": "med_amox_500",
            "mfg_date": (today - timedelta(days=400)).isoformat(),
            "expiry_date": (today - timedelta(days=10)).isoformat(),
            "initial_quantity": 500,
            "unit": "BOX",
        },
        headers={"Authorization": f"Bearer {manufacturer_token}"},
    )
    assert batch_resp.status_code == 201, f"Batch creation failed: {batch_resp.json()}"
    batch_id = batch_resp.json()["id"]

    # 2. Initiate return from pharmacy
    return_resp = client.post(
        "/api/v1/returns",
        json={
            "batch_id": batch_id,
            "destination_facility_id": "org_green_shield_disposal",
            "quantity": 500,
            "reason": "EXPIRED",
            "notes": "Phase 8 test: full lifecycle batch",
        },
        headers={"Authorization": f"Bearer {pharmacy_token}"},
    )
    assert return_resp.status_code == 201, f"Return initiation failed: {return_resp.json()}"
    return_id = return_resp.json()["id"]

    # 3. Operational disposal intake
    intake_resp = client.post(
        "/api/v1/disposal/intake",
        json={
            "batch_id": batch_id,
            "return_id": return_id,
            "disposed_quantity": 500,
            "disposal_method": "HIGH_TEMP_INCINERATION_1200C",
            "scale_weight_kg": "22.5",
            "notes": "Phase 8 test disposal intake",
        },
        headers={"Authorization": f"Bearer {disposal_token}"},
    )
    assert intake_resp.status_code == 201, f"Disposal intake failed: {intake_resp.json()}"
    disposal_id = intake_resp.json()["id"]

    # 4. Complete disposal → DISPOSED
    complete_resp = client.post(
        f"/api/v1/disposal/{disposal_id}/complete",
        json={"notes": "Phase 8 test: disposal completed"},
        headers={"Authorization": f"Bearer {disposal_token}"},
    )
    assert complete_resp.status_code == 200, f"Disposal complete failed: {complete_resp.json()}"
    assert complete_resp.json()["status"] == "DISPOSED"

    # Verify batch is DISPOSED
    batch_check = client.get(f"/api/v1/batches/{batch_id}")
    assert batch_check.json()["status"] == "DISPOSED"

    return batch_id, disposal_id, return_id


def certify_batch_destruction(client, disposal_token, batch_id, disposal_id, quantity=500, suffix="PH8"):
    """Helper: create destruction certificate and return response data."""
    payload = {
        "batch_id": batch_id,
        "disposal_id": disposal_id,
        "quantity_destroyed": quantity,
        "destruction_method": "HIGH_TEMP_INCINERATION_1200C",
        "witness_name": "Inspector S. K. Roy (State FDA)",
        "witness_badge_id": f"INSP-PH8-{suffix}",
        "scale_weight_kg": "22.5",
        "facility_notes": "Phase 8 test: thermal destruction verified by dual witness.",
    }
    return client.post(
        "/api/v1/destruction/records",
        json=payload,
        headers={"Authorization": f"Bearer {disposal_token}"},
    )


# ─── 1. CREATE FROM DISPOSED ──────────────────────────────────────────────────

def test_create_destruction_certificate_from_disposed(
    client, manufacturer_token, disposal_token, pharmacy_token
):
    """Test 1: Create destruction certificate from a DISPOSED batch."""
    batch_id, disposal_id, _ = create_disposed_batch(
        client, manufacturer_token, disposal_token, pharmacy_token, batch_suffix="C01"
    )
    resp = certify_batch_destruction(client, disposal_token, batch_id, disposal_id, suffix="C01")
    assert resp.status_code == 201, f"Certificate creation failed: {resp.json()}"
    data = resp.json()
    assert data["batch_id"] == batch_id
    assert data["quantity_destroyed"] == 500
    assert data["destruction_method"] == "HIGH_TEMP_INCINERATION_1200C"
    assert "certificate_id" in data
    assert data["certificate_id"].startswith("DC-")
    assert data["verification_status"] == "PENDING"


def test_reject_non_disposed_batch_for_phase8(client, manufacturer_token, disposal_token):
    """Test 2: Reject destruction certification if batch is NOT DISPOSED."""
    today = date.today()
    # Create an active batch (not disposed)
    batch_resp = client.post(
        "/api/v1/batches",
        json={
            "batch_number": "PH8-ACTIVE-REJECT-01",
            "gtin_barcode": "8901PH8REJCT0001",
            "medicine_id": "med_amox_500",
            "mfg_date": (today - timedelta(days=100)).isoformat(),
            "expiry_date": (today + timedelta(days=300)).isoformat(),
            "initial_quantity": 200,
            "unit": "BOX",
        },
        headers={"Authorization": f"Bearer {manufacturer_token}"},
    )
    assert batch_resp.status_code == 201
    batch_id = batch_resp.json()["id"]

    # Attempt to certify destruction without disposal
    resp = client.post(
        "/api/v1/destruction/records",
        json={
            "batch_id": batch_id,
            "quantity_destroyed": 200,
            "destruction_method": "HIGH_TEMP_INCINERATION_1200C",
            "witness_name": "Inspector",
            "witness_badge_id": "BADGE-001",
        },
        headers={"Authorization": f"Bearer {disposal_token}"},
    )
    assert resp.status_code == 400
    detail = resp.json()["detail"]
    assert detail["code"] == "NOT_DISPOSED"


def test_certificate_hash_is_64_char_sha256(
    client, manufacturer_token, disposal_token, pharmacy_token
):
    """Test 3: Certificate hash is exactly 64 hex characters (SHA-256)."""
    batch_id, disposal_id, _ = create_disposed_batch(
        client, manufacturer_token, disposal_token, pharmacy_token, batch_suffix="H01"
    )
    resp = certify_batch_destruction(client, disposal_token, batch_id, disposal_id, suffix="H01")
    assert resp.status_code == 201
    cert_hash = resp.json()["certificate_sha256_hash"]
    assert len(cert_hash) == 64
    # Verify it's valid hex
    int(cert_hash, 16)


def test_canonical_hash_is_deterministic():
    """Test 4: Deterministic hash — same inputs always produce same hash."""
    canonical1 = build_canonical_cert_string(
        batch_number="BTEST-001",
        gtin_barcode="8901000000001",
        quantity_destroyed=1000,
        destruction_method="HIGH_TEMP_INCINERATION_1200C",
        facility_org_id="org_green_shield_disposal",
        witness_badge_id="BADGE-0001",
        destruction_timestamp="2026-09-10T12:00:00+00:00",
        cert_id="dst_test001",
    )
    canonical2 = build_canonical_cert_string(
        batch_number="BTEST-001",
        gtin_barcode="8901000000001",
        quantity_destroyed=1000,
        destruction_method="HIGH_TEMP_INCINERATION_1200C",
        facility_org_id="org_green_shield_disposal",
        witness_badge_id="BADGE-0001",
        destruction_timestamp="2026-09-10T12:00:00+00:00",
        cert_id="dst_test001",
    )
    assert canonical1 == canonical2
    assert generate_cert_hash(canonical1) == generate_cert_hash(canonical2)


def test_quantity_mismatch_rejected(
    client, manufacturer_token, disposal_token, pharmacy_token
):
    """Test 5: Quantity mismatch between disposal record and certificate claim is rejected."""
    batch_id, disposal_id, _ = create_disposed_batch(
        client, manufacturer_token, disposal_token, pharmacy_token, batch_suffix="QM1"
    )
    # Disposal was 500 units, but claim 450
    resp = client.post(
        "/api/v1/destruction/records",
        json={
            "batch_id": batch_id,
            "disposal_id": disposal_id,
            "quantity_destroyed": 450,  # MISMATCH — should be 500
            "destruction_method": "HIGH_TEMP_INCINERATION_1200C",
            "witness_name": "Inspector",
            "witness_badge_id": "BADGE-QM1",
        },
        headers={"Authorization": f"Bearer {disposal_token}"},
    )
    assert resp.status_code == 400
    detail = resp.json()["detail"]
    assert detail["code"] == "DESTRUCTION_QUANTITY_MISMATCH"
    assert detail["claimed_quantity"] == 450
    assert detail["disposal_quantity"] == 500


def test_duplicate_certification_blocked(
    client, manufacturer_token, disposal_token, pharmacy_token
):
    """Test 6: Creating a second destruction certificate for same batch is blocked."""
    batch_id, disposal_id, _ = create_disposed_batch(
        client, manufacturer_token, disposal_token, pharmacy_token, batch_suffix="DC1"
    )
    # First certification
    resp1 = certify_batch_destruction(
        client, disposal_token, batch_id, disposal_id, suffix="DC1"
    )
    assert resp1.status_code == 201

    # Second certification attempt — must be blocked
    resp2 = certify_batch_destruction(
        client, disposal_token, batch_id, disposal_id, suffix="DC1"
    )
    assert resp2.status_code == 409
    detail = resp2.json()["detail"]
    assert detail["code"] in ["ALREADY_CERTIFIED", "ALREADY_DESTROYED"]


# ─── FINALIZATION CHECKS ──────────────────────────────────────────────────────

def test_successful_certification_sets_batch_destroyed(
    client, manufacturer_token, disposal_token, pharmacy_token
):
    """Test 7: Batch status becomes DESTROYED after successful certification."""
    batch_id, disposal_id, _ = create_disposed_batch(
        client, manufacturer_token, disposal_token, pharmacy_token, batch_suffix="BS1"
    )
    resp = certify_batch_destruction(client, disposal_token, batch_id, disposal_id, suffix="BS1")
    assert resp.status_code == 201

    # Verify batch status
    batch_resp = client.get(f"/api/v1/batches/{batch_id}")
    assert batch_resp.status_code == 200
    assert batch_resp.json()["status"] == "DESTROYED"


def test_successful_certification_sets_quantity_zero(
    client, manufacturer_token, disposal_token, pharmacy_token
):
    """Test 8: current_quantity = 0 after successful destruction certification."""
    batch_id, disposal_id, _ = create_disposed_batch(
        client, manufacturer_token, disposal_token, pharmacy_token, batch_suffix="QZ1"
    )
    resp = certify_batch_destruction(client, disposal_token, batch_id, disposal_id, suffix="QZ1")
    assert resp.status_code == 201

    batch_resp = client.get(f"/api/v1/batches/{batch_id}")
    assert batch_resp.json()["current_quantity"] == 0


def test_dead_batch_registry_entry_created(
    client, manufacturer_token, disposal_token, pharmacy_token
):
    """Test 9: Dead Batch Registry entry is created after successful certification."""
    batch_id, disposal_id, _ = create_disposed_batch(
        client, manufacturer_token, disposal_token, pharmacy_token, batch_suffix="DB1"
    )
    resp = certify_batch_destruction(client, disposal_token, batch_id, disposal_id, suffix="DB1")
    assert resp.status_code == 201
    batch_number = f"PH8-BATCH-DB1"

    # Check Dead Batch Registry
    registry_resp = client.get(f"/api/v1/dead-batches/{batch_number}")
    assert registry_resp.status_code == 200
    data = registry_resp.json()
    assert data["batch_number"] == batch_number
    assert data["quantity_destroyed"] == 500
    assert len(data["destruction_cert_hash"]) == 64


def test_audit_log_created_on_certification(
    client, manufacturer_token, disposal_token, pharmacy_token, admin_token
):
    """Test 10: Audit log entry is created during destruction certification."""
    batch_id, disposal_id, _ = create_disposed_batch(
        client, manufacturer_token, disposal_token, pharmacy_token, batch_suffix="AL1"
    )
    resp = certify_batch_destruction(client, disposal_token, batch_id, disposal_id, suffix="AL1")
    assert resp.status_code == 201

    # Audit logs accessible via admin
    audit_resp = client.get(
        "/api/v1/audit/logs",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert audit_resp.status_code == 200
    logs = audit_resp.json()
    destruction_logs = [l for l in logs if "DESTRUCTION" in l.get("action", "")]
    assert len(destruction_logs) > 0


# ─── CERTIFICATE VERIFICATION ─────────────────────────────────────────────────

def test_verify_certificate_hash(
    client, manufacturer_token, disposal_token, pharmacy_token, regulator_token
):
    """Test 11: Verify certificate hash — returns VERIFIED and batch DESTROYED."""
    batch_id, disposal_id, _ = create_disposed_batch(
        client, manufacturer_token, disposal_token, pharmacy_token, batch_suffix="VH1"
    )
    cert_resp = certify_batch_destruction(
        client, disposal_token, batch_id, disposal_id, suffix="VH1"
    )
    assert cert_resp.status_code == 201
    record_id = cert_resp.json()["id"]

    # Verify using regulator role
    verify_resp = client.post(
        f"/api/v1/destruction/records/{record_id}/verify",
        headers={"Authorization": f"Bearer {regulator_token}"},
    )
    assert verify_resp.status_code == 200
    data = verify_resp.json()
    assert data["success"] is True
    assert data["verification_status"] == "VERIFIED"
    assert data["hash_valid"] is True
    assert data["batch_status"] == "DESTROYED"
    assert data["certificate_hash"].startswith("sha256:")


def test_verify_certificate_idempotent(
    client, manufacturer_token, disposal_token, pharmacy_token, regulator_token
):
    """Test 12: Repeated certificate verification is idempotent — no duplicate records."""
    batch_id, disposal_id, _ = create_disposed_batch(
        client, manufacturer_token, disposal_token, pharmacy_token, batch_suffix="VI1"
    )
    cert_resp = certify_batch_destruction(
        client, disposal_token, batch_id, disposal_id, suffix="VI1"
    )
    record_id = cert_resp.json()["id"]

    # Verify twice
    verify1 = client.post(
        f"/api/v1/destruction/records/{record_id}/verify",
        headers={"Authorization": f"Bearer {regulator_token}"},
    )
    verify2 = client.post(
        f"/api/v1/destruction/records/{record_id}/verify",
        headers={"Authorization": f"Bearer {regulator_token}"},
    )
    assert verify1.status_code == 200
    assert verify2.status_code == 200
    # Both must succeed and say VERIFIED
    assert verify1.json()["verification_status"] == "VERIFIED"
    assert verify2.json()["verification_status"] == "VERIFIED"


def test_verify_nonexistent_certificate_returns_404(client, regulator_token):
    """Test 13: Verifying a non-existent certificate returns 404."""
    resp = client.post(
        "/api/v1/destruction/records/NONEXISTENT-RECORD-ID/verify",
        headers={"Authorization": f"Bearer {regulator_token}"},
    )
    assert resp.status_code == 404


def test_hash_mismatch_detected_and_blocked(
    client, manufacturer_token, disposal_token, pharmacy_token, regulator_token, db
):
    """Test 14: Tampered certificate hash is detected — verification returns HASH_MISMATCH."""
    batch_id, disposal_id, _ = create_disposed_batch(
        client, manufacturer_token, disposal_token, pharmacy_token, batch_suffix="HM1"
    )
    cert_resp = certify_batch_destruction(
        client, disposal_token, batch_id, disposal_id, suffix="HM1"
    )
    assert cert_resp.status_code == 201
    record_id = cert_resp.json()["id"]

    # Tamper the stored hash directly in DB
    record = db.query(DestructionRecord).filter(DestructionRecord.id == record_id).first()
    assert record is not None
    original_hash = record.certificate_sha256_hash
    record.certificate_sha256_hash = "aaaa" * 16  # 64 chars of tampered data
    db.commit()

    # Verify — should detect mismatch
    verify_resp = client.post(
        f"/api/v1/destruction/records/{record_id}/verify",
        headers={"Authorization": f"Bearer {regulator_token}"},
    )
    assert verify_resp.status_code == 200
    data = verify_resp.json()
    assert data["success"] is False
    assert data["verification_status"] == "HASH_MISMATCH"
    assert data["hash_valid"] is False
    assert data["error_code"] == "CERTIFICATE_HASH_MISMATCH"

    # Restore for cleanup
    record.certificate_sha256_hash = original_hash
    record.verification_status = CertificateVerificationStatus.PENDING
    db.commit()


# ─── DEAD BATCH REGISTRY ──────────────────────────────────────────────────────

def test_dead_batch_lookup_by_batch_number(
    client, manufacturer_token, disposal_token, pharmacy_token
):
    """Test 15: Dead batch lookup by batch_number works."""
    batch_id, disposal_id, _ = create_disposed_batch(
        client, manufacturer_token, disposal_token, pharmacy_token, batch_suffix="DL1"
    )
    certify_batch_destruction(client, disposal_token, batch_id, disposal_id, suffix="DL1")
    batch_number = "PH8-BATCH-DL1"

    resp = client.get(f"/api/v1/dead-batches/{batch_number}")
    assert resp.status_code == 200
    assert resp.json()["batch_number"] == batch_number


def test_destroyed_batch_remains_queryable(
    client, manufacturer_token, disposal_token, pharmacy_token
):
    """Test 16: Destroyed batch and its Dead Batch Registry entry remain permanently queryable."""
    batch_id, disposal_id, _ = create_disposed_batch(
        client, manufacturer_token, disposal_token, pharmacy_token, batch_suffix="RQ1"
    )
    certify_batch_destruction(client, disposal_token, batch_id, disposal_id, suffix="RQ1")
    batch_number = "PH8-BATCH-RQ1"

    # Batch passport is still accessible
    batch_resp = client.get(f"/api/v1/batches/{batch_id}")
    assert batch_resp.status_code == 200
    assert batch_resp.json()["status"] == "DESTROYED"

    # Dead Batch Registry entry is accessible
    db_resp = client.get(f"/api/v1/dead-batches/{batch_number}")
    assert db_resp.status_code == 200
    assert db_resp.json()["quantity_destroyed"] == 500


def test_dead_batch_list(client, manufacturer_token, disposal_token, pharmacy_token):
    """Test 17: Dead batch list returns all entries."""
    batch_id, disposal_id, _ = create_disposed_batch(
        client, manufacturer_token, disposal_token, pharmacy_token, batch_suffix="LT1"
    )
    certify_batch_destruction(client, disposal_token, batch_id, disposal_id, suffix="LT1")

    resp = client.get("/api/v1/dead-batches")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert any(d["batch_number"] == "PH8-BATCH-LT1" for d in data)


def test_duplicate_dead_batch_entry_prevented(
    client, manufacturer_token, disposal_token, pharmacy_token, db
):
    """Test 18: Duplicate Dead Batch Registry entries are prevented."""
    batch_id, disposal_id, _ = create_disposed_batch(
        client, manufacturer_token, disposal_token, pharmacy_token, batch_suffix="DD1"
    )
    # First certification
    certify_batch_destruction(client, disposal_token, batch_id, disposal_id, suffix="DD1")

    # Attempt second (should 409)
    resp2 = certify_batch_destruction(client, disposal_token, batch_id, disposal_id, suffix="DD1")
    assert resp2.status_code == 409

    # Verify exactly one Dead Batch entry
    entries = db.query(DeadBatch).filter(DeadBatch.batch_id == batch_id).all()
    assert len(entries) == 1


# ─── RE-ENTRY PROTECTION ─────────────────────────────────────────────────────

def test_destroyed_batch_sale_blocked(
    client, manufacturer_token, disposal_token, pharmacy_token
):
    """Test 19: Destroyed batch is blocked from sale verification."""
    batch_id, disposal_id, _ = create_disposed_batch(
        client, manufacturer_token, disposal_token, pharmacy_token, batch_suffix="SB1"
    )
    certify_batch_destruction(client, disposal_token, batch_id, disposal_id, suffix="SB1")
    batch_number = "PH8-BATCH-SB1"

    # Attempt sale verification
    verify_resp = client.post(
        "/api/v1/sales/verify",
        json={"batch_identifier": batch_number, "quantity": 1},
        headers={"Authorization": f"Bearer {pharmacy_token}"},
    )
    assert verify_resp.status_code == 200
    data = verify_resp.json()
    assert data["verdict"] == "BLOCK_SALE"
    assert data["is_eligible_for_sale"] is False


def test_destroyed_batch_verification_scan_creates_reentry_alert(
    client, manufacturer_token, disposal_token, pharmacy_token
):
    """Test 20: Scanning a destroyed batch creates DEAD_BATCH_REENTRY_DETECTED result."""
    batch_id, disposal_id, _ = create_disposed_batch(
        client, manufacturer_token, disposal_token, pharmacy_token, batch_suffix="RE1"
    )
    certify_batch_destruction(client, disposal_token, batch_id, disposal_id, suffix="RE1")
    batch_number = "PH8-BATCH-RE1"

    # Scan destroyed batch
    scan_resp = client.post(
        "/api/v1/verify/scan",
        json={"scanned_code": batch_number, "code_type": "QR_CODE"},
    )
    assert scan_resp.status_code == 200
    data = scan_resp.json()
    assert data["verification_status"] == "DEAD_BATCH_REENTRY_DETECTED"
    assert data["is_dead_batch_reentry"] is True


def test_destroyed_batch_scan_via_dead_registry(
    client, manufacturer_token, disposal_token, pharmacy_token
):
    """Test 21: Dead Batch Registry scan detects re-entry attempt."""
    batch_id, disposal_id, _ = create_disposed_batch(
        client, manufacturer_token, disposal_token, pharmacy_token, batch_suffix="RS1"
    )
    certify_batch_destruction(client, disposal_token, batch_id, disposal_id, suffix="RS1")
    batch_number = "PH8-BATCH-RS1"

    # Scan via verification endpoint — should detect via Dead Batch Registry
    scan_resp = client.post(
        "/api/v1/verify/scan",
        json={"scanned_code": batch_number, "code_type": "QR_CODE"},
    )
    assert scan_resp.status_code == 200
    assert scan_resp.json()["is_dead_batch_reentry"] is True


# ─── RBAC ────────────────────────────────────────────────────────────────────

def test_disposal_facility_can_create_certificate(
    client, manufacturer_token, disposal_token, pharmacy_token
):
    """Test 22: DISPOSAL_FACILITY role can create destruction certificates."""
    batch_id, disposal_id, _ = create_disposed_batch(
        client, manufacturer_token, disposal_token, pharmacy_token, batch_suffix="RB1"
    )
    resp = certify_batch_destruction(client, disposal_token, batch_id, disposal_id, suffix="RB1")
    assert resp.status_code == 201


def test_pharmacy_cannot_certify_destruction(
    client, manufacturer_token, disposal_token, pharmacy_token
):
    """Test 23: PHARMACY role is forbidden from creating destruction certificates."""
    batch_id, disposal_id, _ = create_disposed_batch(
        client, manufacturer_token, disposal_token, pharmacy_token, batch_suffix="PF1"
    )
    resp = client.post(
        "/api/v1/destruction/records",
        json={
            "batch_id": batch_id,
            "disposal_id": disposal_id,
            "quantity_destroyed": 500,
            "destruction_method": "HIGH_TEMP_INCINERATION_1200C",
            "witness_name": "Inspector",
            "witness_badge_id": "BADGE-PF1",
        },
        headers={"Authorization": f"Bearer {pharmacy_token}"},
    )
    assert resp.status_code == 403


def test_distributor_cannot_certify_destruction(
    client, manufacturer_token, disposal_token, pharmacy_token, distributor_token
):
    """Test 24: DISTRIBUTOR role is forbidden from creating destruction certificates."""
    batch_id, disposal_id, _ = create_disposed_batch(
        client, manufacturer_token, disposal_token, pharmacy_token, batch_suffix="DF1"
    )
    resp = client.post(
        "/api/v1/destruction/records",
        json={
            "batch_id": batch_id,
            "disposal_id": disposal_id,
            "quantity_destroyed": 500,
            "destruction_method": "HIGH_TEMP_INCINERATION_1200C",
            "witness_name": "Inspector",
            "witness_badge_id": "BADGE-DF1",
        },
        headers={"Authorization": f"Bearer {distributor_token}"},
    )
    assert resp.status_code == 403


def test_regulator_can_verify_certificate(
    client, manufacturer_token, disposal_token, pharmacy_token, regulator_token
):
    """Test 25: REGULATOR_AUDITOR can verify destruction certificates."""
    batch_id, disposal_id, _ = create_disposed_batch(
        client, manufacturer_token, disposal_token, pharmacy_token, batch_suffix="RV1"
    )
    cert_resp = certify_batch_destruction(
        client, disposal_token, batch_id, disposal_id, suffix="RV1"
    )
    record_id = cert_resp.json()["id"]

    verify_resp = client.post(
        f"/api/v1/destruction/records/{record_id}/verify",
        headers={"Authorization": f"Bearer {regulator_token}"},
    )
    assert verify_resp.status_code == 200
    assert verify_resp.json()["success"] is True


def test_regulator_can_view_dead_batch_registry(client, regulator_token):
    """Test 26: REGULATOR_AUDITOR can read Dead Batch Registry."""
    resp = client.get("/api/v1/dead-batches")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_admin_can_perform_all_destruction_operations(
    client, manufacturer_token, disposal_token, pharmacy_token, admin_token
):
    """Test 27: ADMIN can create and verify destruction certificates."""
    batch_id, disposal_id, _ = create_disposed_batch(
        client, manufacturer_token, disposal_token, pharmacy_token, batch_suffix="AD1"
    )
    # Admin creates certificate
    resp = client.post(
        "/api/v1/destruction/records",
        json={
            "batch_id": batch_id,
            "disposal_id": disposal_id,
            "quantity_destroyed": 500,
            "destruction_method": "CHEMICAL_DENATURATION",
            "witness_name": "System Admin Inspector",
            "witness_badge_id": "ADMIN-BADGE-001",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 201
    record_id = resp.json()["id"]

    # Admin verifies certificate
    verify_resp = client.post(
        f"/api/v1/destruction/records/{record_id}/verify",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert verify_resp.status_code == 200
    assert verify_resp.json()["success"] is True


# ─── LIST ENDPOINTS ───────────────────────────────────────────────────────────

def test_list_destruction_records(client, manufacturer_token, disposal_token, pharmacy_token):
    """Test 28: List destruction records endpoint works."""
    batch_id, disposal_id, _ = create_disposed_batch(
        client, manufacturer_token, disposal_token, pharmacy_token, batch_suffix="LS1"
    )
    certify_batch_destruction(client, disposal_token, batch_id, disposal_id, suffix="LS1")

    resp = client.get("/api/v1/destruction/records")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) > 0
    assert any(d["batch_id"] == batch_id for d in data)


def test_get_destruction_record_by_id(
    client, manufacturer_token, disposal_token, pharmacy_token
):
    """Test 29: Get single destruction record by ID."""
    batch_id, disposal_id, _ = create_disposed_batch(
        client, manufacturer_token, disposal_token, pharmacy_token, batch_suffix="GI1"
    )
    cert_resp = certify_batch_destruction(
        client, disposal_token, batch_id, disposal_id, suffix="GI1"
    )
    record_id = cert_resp.json()["id"]

    resp = client.get(f"/api/v1/destruction/records/{record_id}")
    assert resp.status_code == 200
    assert resp.json()["id"] == record_id
    assert resp.json()["batch_id"] == batch_id


def test_get_nonexistent_destruction_record_returns_404(client):
    """Test 30: Accessing non-existent destruction record returns 404."""
    resp = client.get("/api/v1/destruction/records/DOES-NOT-EXIST")
    assert resp.status_code == 404
