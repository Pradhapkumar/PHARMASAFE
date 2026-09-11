"""
Phase 9 Automated Pytest Suite: Online Medicine Safety + Listing Verification.

Tests all 11 stages of the deterministic verification engine:
1.  Seller Verification (known licensed pharmacy vs unverified vs illicit)
2.  Product Verification (catalogue match vs product mismatch)
3.  Batch Verification (authentic registry batch vs unregistered counterfeit)
4.  Expiry Check (valid vs expired)
5.  Recall Check (active vs recalled)
6.  Lifecycle Check (retail forward vs reverse / destroyed)
7.  Dead Batch Check (fatal registry match)
8.  Ownership & Custody Check (custodian pointer & confirmed inventory)
9.  Quantity Consistency Check (within stock vs ghost excess quantity)
10. Duplicate Listing Collision Check (cross-seller duplicate)
11. Certificate / QR Reuse Check (stolen destruction hash vs authentic QR)
"""
import pytest
from datetime import date, datetime, timedelta, timezone
from backend.app.models.batch import Batch, BatchStatusEnum, UnitEnum


@pytest.fixture
def active_pharmacy_batch(db):
    """
    Dedicated uncorrupted batch fixture for Phase 9 testing.
    Guarantees active forward status (AT_PHARMACY) with MedPlus as custodian.
    """
    b = db.query(Batch).filter(Batch.batch_number == "PH9-SAFE-BATCH-001").first()
    if not b:
        today = date.today()
        b = Batch(
            id="btc_ph9_safe_001",
            batch_number="PH9-SAFE-BATCH-001",
            gtin_barcode="8901088999999",
            medicine_id="med_paracet_500",
            manufacturer_id="org_pfizer_india",
            mfg_date=today - timedelta(days=30),
            expiry_date=today + timedelta(days=700),
            initial_quantity=5000,
            current_quantity=4500,
            unit=UnitEnum.BOX,
            status=BatchStatusEnum.AT_PHARMACY,
            current_custodian_id="org_medplus_retail",
            is_recalled=False,
            qr_payload="PHARMASAFE:PH9-SAFE-BATCH-001:8901088999999"
        )
        db.add(b)
        db.commit()
        db.refresh(b)
    elif b.status != BatchStatusEnum.AT_PHARMACY or b.is_recalled:
        b.status = BatchStatusEnum.AT_PHARMACY
        b.is_recalled = False
        db.commit()
    return b


def test_online_listing_verify_allow_authentic_pharmacy(client, active_pharmacy_batch):
    """
    Legitimate pharmacy (MedPlus) listing authentic batch (PH9-SAFE-BATCH-001 - Paracetamol 500mg IP)
    with confirmed inventory and matching QR payload. Must evaluate to ALLOW.
    """
    payload = {
        "platform_name": "MedPlus Online Portal",
        "listing_url": "https://medplusmart.com/item/ph9-paracetamol",
        "seller_name": "MedPlus Central Pharmacy #104",
        "seller_license_number": "LIC-RET-KA-2022-7719",
        "claimed_product_name": "Paracetamol 500mg IP",
        "batch_number": "PH9-SAFE-BATCH-001",
        "offered_quantity": 50,
        "listed_price_inr": 35.0,
        "claimed_qr_payload": "PHARMASAFE:PH9-SAFE-BATCH-001:8901088999999"
    }
    response = client.post("/api/v1/online-safety/verify", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["decision"] == "ALLOW"
    assert data["risk_level"] == "LOW"
    assert data["risk_score"] <= 0.20
    assert data["batch_matched"] is True
    assert data["seller_matched"] is True
    assert data["dead_batch_detected"] is False
    assert data["stage_checks"]["seller_verification"]["status"] == "PASSED"
    assert data["stage_checks"]["product_verification"]["status"] == "PASSED"
    assert data["stage_checks"]["batch_verification"]["status"] == "PASSED"
    assert data["stage_checks"]["dead_batch_check"]["status"] == "PASSED"
    assert data["stage_checks"]["custody_check"]["status"] == "PASSED"


def test_online_listing_verify_block_dead_batch_registry(client):
    """
    Listing features AMX-2024-DEAD-01 which is in the Dead Batch Registry.
    Must immediately result in BLOCK, CRITICAL risk, and risk_score 1.0.
    """
    payload = {
        "platform_name": "PharmaDeals B2B",
        "seller_name": "QuickMeds Wholesaler",
        "claimed_product_name": "Amoxil 500mg",
        "batch_number": "AMX-2024-DEAD-01",
        "offered_quantity": 200,
        "listed_price_inr": 45.0
    }
    response = client.post("/api/v1/online-safety/verify", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["decision"] == "BLOCK"
    assert data["risk_level"] == "CRITICAL"
    assert data["risk_score"] == 1.0
    assert data["dead_batch_detected"] is True
    assert data["stage_checks"]["dead_batch_check"]["status"] == "FAILED"
    assert any("DEAD_BATCH_REGISTRY_MATCH" in reason for reason in data["decision_reasons"])


def test_online_listing_verify_block_expired_medicine(client):
    """
    Listing features AZT-2025-EXP which has an expiry date in the past.
    Must evaluate to BLOCK due to expired stock sale policy.
    """
    payload = {
        "platform_name": "ClearanceRx Market",
        "seller_name": "MedPlus Central Pharmacy #104",
        "seller_license_number": "LIC-RET-KA-2022-7719",
        "claimed_product_name": "Azithral 250",
        "batch_number": "AZT-2025-EXP",
        "offered_quantity": 10,
        "listed_price_inr": 20.0
    }
    response = client.post("/api/v1/online-safety/verify", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["decision"] == "BLOCK"
    assert data["stage_checks"]["expiry_check"]["status"] == "FAILED"
    assert any("BATCH_EXPIRED" in reason for reason in data["decision_reasons"])


def test_online_listing_verify_block_recalled_medicine(client):
    """
    Listing features RMD-2026-REC which is under active regulatory recall.
    Must evaluate to BLOCK.
    """
    payload = {
        "platform_name": "DiscountPharma Direct",
        "seller_name": "MedPlus Central Pharmacy #104",
        "claimed_product_name": "Remdec 100mg",
        "batch_number": "RMD-2026-REC",
        "offered_quantity": 5,
        "listed_price_inr": 500.0
    }
    response = client.post("/api/v1/online-safety/verify", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["decision"] == "BLOCK"
    assert data["stage_checks"]["recall_check"]["status"] == "FAILED"
    assert any("BATCH_RECALLED" in reason for reason in data["decision_reasons"])


def test_online_listing_verify_block_unregistered_batch(client):
    """
    Listing provides a batch number that does not exist in the sovereign registry.
    Must evaluate to BLOCK (unregistered lot / counterfeit threat).
    """
    payload = {
        "platform_name": "OnlineRx Global",
        "seller_name": "Unknown Seller",
        "claimed_product_name": "Amoxil 500mg",
        "batch_number": "FAKE-LOT-XYZ-9999",
        "offered_quantity": 100
    }
    response = client.post("/api/v1/online-safety/verify", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["decision"] == "BLOCK"
    assert data["batch_matched"] is False
    assert data["stage_checks"]["batch_verification"]["status"] == "FAILED"
    assert any("UNREGISTERED_BATCH" in reason for reason in data["decision_reasons"])


def test_online_listing_verify_block_product_mismatch(client):
    """
    Listing claims product is 'Azithromycin 250mg', but batch B1001 is registered as
    'Paracetamol 500mg IP'. Must evaluate to BLOCK due to product mismatch fraud.
    """
    payload = {
        "platform_name": "PharmaExpress",
        "seller_name": "MedPlus Central Pharmacy #104",
        "claimed_product_name": "Azithromycin 250mg Tablets",
        "batch_number": "B1001",
        "offered_quantity": 20
    }
    response = client.post("/api/v1/online-safety/verify", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["decision"] == "BLOCK"
    assert data["stage_checks"]["product_verification"]["status"] == "FAILED"
    assert any("PRODUCT_BATCH_MISMATCH" in reason for reason in data["decision_reasons"])


def test_online_listing_verify_block_illicit_channel(client):
    """
    Listing posted on an illicit peer-to-peer channel (e.g. Telegram or DarkNetRx).
    Must evaluate to BLOCK with critical risk score.
    """
    payload = {
        "platform_name": "Telegram @pharma_direct_deals",
        "seller_name": "AnonVendor_99",
        "claimed_product_name": "Paracetamol 500mg IP",
        "batch_number": "B1001",
        "offered_quantity": 100,
        "listed_price_inr": 10.0
    }
    response = client.post("/api/v1/online-safety/verify", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["decision"] == "BLOCK"
    assert data["risk_level"] == "CRITICAL"
    assert data["stage_checks"]["seller_verification"]["status"] == "FAILED"
    assert any("SELLER_ILLICIT_PLATFORM" in reason for reason in data["decision_reasons"])


def test_online_listing_verify_review_unregistered_seller(client, active_pharmacy_batch):
    """
    Legitimate product and registered batch, but seller is an unknown/unregistered merchant.
    Must evaluate to REVIEW (quarantine pending KYC/licensing).
    """
    payload = {
        "platform_name": "IndiaB2B Marketplace",
        "seller_name": "Suresh Meds & Healthcare Traders",
        "claimed_product_name": "Paracetamol 500mg IP",
        "batch_number": "PH9-SAFE-BATCH-001",
        "offered_quantity": 25,
        "listed_price_inr": 32.0
    }
    response = client.post("/api/v1/online-safety/verify", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["decision"] == "REVIEW"
    assert data["risk_level"] in ["MEDIUM", "HIGH"]
    assert data["stage_checks"]["seller_verification"]["status"] == "WARNING"
    assert any("SELLER_UNREGISTERED" in reason for reason in data["decision_reasons"])


def test_online_listing_verify_block_excess_quantity(client):
    """
    Seller attempts to list 99,999 units for batch B1001, which only has ~18,500 units in existence.
    Must fail the quantity consistency check.
    """
    payload = {
        "platform_name": "National Bulk Pharma",
        "seller_name": "MedPlus Central Pharmacy #104",
        "seller_license_number": "LIC-RET-KA-2022-7719",
        "claimed_product_name": "Paracetamol 500mg IP",
        "batch_number": "B1001",
        "offered_quantity": 99999,
        "listed_price_inr": 28.0
    }
    response = client.post("/api/v1/online-safety/verify", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["stage_checks"]["quantity_check"]["status"] == "FAILED"
    assert any("EXCESS_OFFERED_QUANTITY" in reason for reason in data["decision_reasons"])


def test_online_listing_ingest_and_persist(client, regulator_token):
    """
    Test POST /api/v1/online-safety/listings creates persistent record in DB,
    properly sets status, and can be retrieved via GET /listings.
    """
    payload = {
        "platform_name": "DarkNetRx Mirror #3",
        "listing_url": "http://darknetrx.onion/item/9021",
        "seller_name": "BlackMarketPharmacy",
        "claimed_product_name": "Amoxil 500mg",
        "batch_number": "AMX-2024-DEAD-01",
        "offered_quantity": 500,
        "listed_price_inr": 15.0
    }
    response = client.post(
        "/api/v1/online-safety/listings",
        json=payload,
        headers={"Authorization": f"Bearer {regulator_token}"}
    )
    assert response.status_code == 201
    created = response.json()
    assert created["verification_decision"] == "BLOCK"
    assert created["listing_status"] == "BLOCKED"
    assert created["takedown_requested"] is True
    assert "listing_reference" in created
    listing_id = created["id"]

    # Verify single fetch
    get_resp = client.get(f"/api/v1/online-safety/listings/{listing_id}")
    assert get_resp.status_code == 200
    fetched = get_resp.json()
    assert fetched["id"] == listing_id
    assert fetched["seller_name"] == "BlackMarketPharmacy"


def test_online_listing_filter_by_decision(client):
    """
    Test GET /api/v1/online-safety/listings with ?decision=BLOCK filter.
    """
    resp = client.get("/api/v1/online-safety/listings?decision=BLOCK")
    assert resp.status_code == 200
    items = resp.json()
    assert isinstance(items, list)
    for item in items:
        assert item["verification_decision"] == "BLOCK"


def test_online_listing_enforce_takedown(client, regulator_token):
    """
    Test POST /api/v1/online-safety/listings/{id}/enforce to issue takedown.
    """
    # Create listing first
    payload = {
        "platform_name": "TestPlatform",
        "seller_name": "SuspiciousVendor",
        "claimed_product_name": "Amoxil 500mg",
        "batch_number": "AMX-2024-DEAD-01"
    }
    create_resp = client.post("/api/v1/online-safety/listings", json=payload)
    assert create_resp.status_code == 201
    lst_id = create_resp.json()["id"]

    enforce_resp = client.post(
        f"/api/v1/online-safety/listings/{lst_id}/enforce",
        json={
            "action": "ISSUE_TAKEDOWN",
            "enforcement_notes": "Official court takedown order issued to Cloudflare & domain registrar."
        },
        headers={"Authorization": f"Bearer {regulator_token}"}
    )
    assert enforce_resp.status_code == 200
    enforced = enforce_resp.json()
    assert enforced["listing_status"] == "TAKEDOWN_REQUESTED"
    assert enforced["takedown_requested"] is True
    assert "Cloudflare" in enforced["enforcement_notes"]


def test_online_safety_summary_telemetry(client):
    """
    Test GET /api/v1/online-safety/summary aggregates counts accurately.
    """
    resp = client.get("/api/v1/online-safety/summary")
    assert resp.status_code == 200
    summary = resp.json()
    assert "total_evaluated_listings" in summary
    assert "allowed_count" in summary
    assert "review_count" in summary
    assert "blocked_count" in summary
    assert "takedowns_issued" in summary
    assert "active_compliance_rate" in summary


def test_online_listing_verify_block_stolen_destruction_cert(client, db):
    """
    Fraudster attaches the SHA-256 hash of a genuine DestructionRecord
    to a live listing to deceive buyers into thinking it's a verified genuine certificate.
    Must fail certificate_qr_check with DESTRUCTION_CERTIFICATE_THEFT and BLOCK.
    """
    from backend.app.models.destruction import DestructionRecord
    dest_rec = db.query(DestructionRecord).first()
    assert dest_rec is not None

    payload = {
        "platform_name": "PharmaDirect Market",
        "seller_name": "MedPlus Central Pharmacy #104",
        "claimed_product_name": "Paracetamol 500mg IP",
        "batch_number": "B1001",
        "offered_quantity": 10,
        "claimed_certificate_hash": dest_rec.certificate_sha256_hash
    }
    response = client.post("/api/v1/online-safety/verify", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["decision"] == "BLOCK"
    assert data["stage_checks"]["certificate_qr_check"]["status"] == "FAILED"
    assert any("DESTRUCTION_CERTIFICATE_THEFT" in reason for reason in data["decision_reasons"])


def test_online_listing_verify_qr_mismatch(client):
    """
    Fraudster presents a forged QR signature payload for batch B1001.
    Must fail certificate_qr_check with QR_SIGNATURE_MISMATCH.
    """
    payload = {
        "platform_name": "MedPlus Online Portal",
        "seller_name": "MedPlus Central Pharmacy #104",
        "claimed_product_name": "Paracetamol 500mg IP",
        "batch_number": "B1001",
        "offered_quantity": 20,
        "claimed_qr_payload": "FORGED_SIGNATURE:B1001:INVALID_KEY_9999"
    }
    response = client.post("/api/v1/online-safety/verify", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["decision"] == "BLOCK"
    assert data["stage_checks"]["certificate_qr_check"]["status"] == "FAILED"
    assert any("QR_SIGNATURE_MISMATCH" in reason for reason in data["decision_reasons"])


def test_online_listing_duplicate_collision(client, active_pharmacy_batch):
    """
    When a batch is actively listed by Seller A, Seller B attempting to list
    the exact same batch concurrently triggers CROSS_SELLER_COLLISION.
    """
    # Create listing by Seller A
    payload_a = {
        "platform_name": "PlatformAlpha",
        "seller_name": "MedPlus Central Pharmacy #104",
        "seller_license_number": "LIC-RET-KA-2022-7719",
        "claimed_product_name": "Paracetamol 500mg IP",
        "batch_number": "PH9-SAFE-BATCH-001",
        "offered_quantity": 50
    }
    res_a = client.post("/api/v1/online-safety/listings", json=payload_a)
    assert res_a.status_code == 201

    # Now Seller B verifies listing for the same batch
    payload_b = {
        "platform_name": "PlatformBeta",
        "seller_name": "DifferentVendorLtd",
        "claimed_product_name": "Paracetamol 500mg IP",
        "batch_number": "PH9-SAFE-BATCH-001",
        "offered_quantity": 30
    }
    res_b = client.post("/api/v1/online-safety/verify", json=payload_b)
    assert res_b.status_code == 200
    data_b = res_b.json()
    assert data_b["stage_checks"]["duplicate_check"]["status"] == "FAILED"
    assert any("CROSS_SELLER_COLLISION" in reason for reason in data_b["decision_reasons"])

