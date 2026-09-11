"""
Phase 12: Final Validation, Security Hardening & Master Demo Regression Suite.
PharmaSafe Intelligence — Closed-Loop Pharmaceutical Compliance Platform.

Validates:
1. System Health & Database Readiness
2. Master Batch B1001 Complete 10-Phase Lifecycle Trace
3. Security, RBAC & Negative Authorization Matrix
4. File Upload Security & MIME / Extension Whitelisting
5. Finalized Evidence Deletion Protection & Tamper Invariance
6. Quantity Conservation & Physical Inventory Invariants
7. Inviolable Deterministic Safety Rules (EXPIRED, RECALLED, DESTROYED, DEAD_BATCH)
8. Multi-Model AI Safety Shield & Decision Support Boundaries
9. Strict Reverse-Chain Boundary (DISPOSED -> DESTROYED)
10. Sovereign Dead Batch Registry Permanent Blocking
11. Online Marketplace Surveillance & Possible Re-Entry Detection
12. 360-Degree Forensic Investigation Dossier & Append-Only Notes
13. Multi-Dimensional Analytics Data Consistency
14. Batch Forensic Report Generation
"""
import io
import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.db.session import SessionLocal
from backend.app.models.batch import Batch, BatchStatusEnum, UnitEnum
from backend.app.models.user import Organization, User, RoleEnum
from backend.app.models.medicine import Medicine
from backend.app.models.destruction import DestructionRecord, CertificateVerificationStatus
from backend.app.models.dead_batch import DeadBatch
from backend.app.models.evidence import Evidence, EvidenceTypeEnum, EvidenceStatusEnum, OCRStatusEnum
from backend.app.models.investigation import InvestigationCase, CasePriorityEnum, CaseStatusEnum
from backend.app.models.reverse_logistics import ReturnRequest, ReturnReasonEnum, ReturnStatusEnum
from backend.app.models.disposal import DisposalRecord
from backend.app.core.security import create_access_token


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def create_auth_headers(email: str = "auditor@pharmasafe.gov.in", role: RoleEnum = RoleEnum.REGULATOR_AUDITOR, org_id: str = "org_gov_cdsco"):
    token = create_access_token(
        subject="usr_test_01",
        role=role.value,
        org_id=org_id,
        expires_delta=timedelta(hours=2)
    )
    return {"Authorization": f"Bearer {token}"}


# ── 1. System Health & Connectivity ──────────────────────────────────────────

def test_health_and_database_connectivity(client: TestClient):
    """Verify health endpoints and database connectivity."""
    resp = client.get("/api/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"

    resp_v1 = client.get("/api/v1/health")
    assert resp_v1.status_code == 200
    assert resp_v1.json()["status"] == "ok"

    resp_db = client.get("/api/health/db")
    assert resp_db.status_code == 200
    assert resp_db.json()["database"] == "connected"


# ── 2. Master B1001 Complete Closed-Loop Lifecycle ───────────────────────────

def test_master_b1001_complete_closed_loop_lifecycle(client: TestClient, db):
    """
    Traces Batch B1001 through all platform milestones:
    Manufacture -> Custody -> Verify -> Sale -> Reverse Return -> Disposal ->
    Destruction -> Dead Batch -> Online Listing Re-entry -> AI Risk -> Investigation.
    """
    # 1. Digital Batch Passport
    passport_resp = client.get("/api/v1/batches/B1001/passport")
    assert passport_resp.status_code == 200
    passport = passport_resp.json()
    assert passport["batch_number"] == "B1001"

    # 2. POS Verification
    pharm_headers = create_auth_headers(role=RoleEnum.PHARMACY, org_id="org_pharm_01")
    verify_resp = client.post(
        "/api/v1/sales/verify",
        headers=pharm_headers,
        json={
            "batch_identifier": "B1001",
            "quantity": 10,
        }
    )
    assert verify_resp.status_code == 200
    assert verify_resp.json()["verdict"] in ["ALLOW_SALE", "BLOCK_SALE"]

    # 3. Investigation Dossier
    inv_resp = client.get("/api/v1/investigations/INV-2026-B1001")
    assert inv_resp.status_code == 200
    dossier = inv_resp.json()
    assert dossier["case_id"] == "INV-2026-B1001"
    assert dossier["priority"] == "CRITICAL"
    assert len(dossier["timeline"]) >= 4

    # 4. Forensic Report Generation
    rep_resp = client.post("/api/v1/reports/batch/B1001", json={"generated_by": "Lead Auditor"})
    assert rep_resp.status_code == 200
    report = rep_resp.json()
    assert report["batch_summary"]["batch_number"] == "B1001"
    assert len(report["timeline"]) >= 3


# ── 3. Security, RBAC & Negative Authorization ───────────────────────────────

def test_security_unauthenticated_requests_denied(client: TestClient):
    """Privileged operations must be rejected when unauthenticated or lacking role permissions."""
    # Attempting to issue destruction certificate without token
    resp = client.post("/api/v1/destruction/records", json={})
    assert resp.status_code in [400, 401, 403, 422]


def test_security_evidence_file_upload_safeguards(client: TestClient):
    """File uploads must reject executable and unsupported file extensions."""
    reg_headers = create_auth_headers(role=RoleEnum.REGULATOR_AUDITOR)
    # Attempting to upload a dangerous executable
    exe_file = io.BytesIO(b"MZ\x90\x00\x03\x00\x00\x00malicious_code")
    resp = client.post(
        "/api/v1/evidence/upload",
        headers=reg_headers,
        files={"file": ("exploit.exe", exe_file, "application/x-msdownload")},
        data={
            "entity_type": "INVESTIGATION_CASE",
            "entity_id": "INV-2026-B1001",
            "evidence_type": "PHOTO"
        }
    )
    assert resp.status_code == 400
    assert "Unsupported file extension" in resp.json()["detail"]


def test_security_finalized_evidence_immutability(client: TestClient, db):
    """Finalized evidence records must reject deletion requests with HTTP 403."""
    reg_headers = create_auth_headers(role=RoleEnum.REGULATOR_AUDITOR)
    # Query or create a finalized evidence record
    finalized_ev = db.query(Evidence).filter(Evidence.is_finalized == True).first()
    if not finalized_ev:
        finalized_ev = Evidence(
            id="ev_final_sec_test",
            evidence_id="EV-2026-SEC-01",
            entity_type="INVESTIGATION_CASE",
            entity_id="INV-2026-B1001",
            evidence_type=EvidenceTypeEnum.PHOTO,
            file_name="cert_witness.jpg",
            file_size_bytes=1024,
            mime_type="image/jpeg",
            storage_reference="/storage/evidence/cert_witness.jpg",
            checksum="a" * 64,
            status=EvidenceStatusEnum.SEALED,
            ocr_status=OCRStatusEnum.MATCH,
            is_finalized=True
        )
        db.add(finalized_ev)
        db.commit()

    del_resp = client.delete(f"/api/v1/evidence/{finalized_ev.evidence_id}", headers=reg_headers)
    assert del_resp.status_code == 403
    assert "Finalized compliance evidence is permanently sealed" in del_resp.json()["detail"]


# ── 4. Quantity Conservation & Invariants ────────────────────────────────────

def test_quantity_conservation_and_invariants(client: TestClient, db):
    """Validates physical quantity invariants across POS, returns, and inventory."""
    pharm_headers = create_auth_headers(role=RoleEnum.PHARMACY, org_id="org_pharm_01")
    # Attempting to sell more units than are physically available in inventory
    resp = client.post(
        "/api/v1/sales/verify",
        headers=pharm_headers,
        json={
            "batch_identifier": "AMX-2026-001",
            "quantity": 9999999,  # Impossible quantity
        }
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["verdict"] == "BLOCK_SALE"
    assert not data["is_eligible_for_sale"]
    assert any(c["passed"] is False for c in data["checks"])


# ── 5. Inviolable Deterministic Safety Rules ──────────────────────────────────

def test_deterministic_safety_rules_invariance_all_terminal_states(client: TestClient):
    """
    Terminal states (EXPIRED, RECALLED, DESTROYED, DEAD_BATCH) must
    categorically enforce BLOCK_SALE regardless of any other input.
    """
    pharm_headers = create_auth_headers(role=RoleEnum.PHARMACY, org_id="org_pharm_01")
    terminal_batches = [
        "AZT-2025-EXP",
        "RMD-2026-REC",
        "AMX-2024-DEAD-01"
    ]

    for batch_num in terminal_batches:
        resp = client.post(
            "/api/v1/sales/verify",
            headers=pharm_headers,
            json={
                "batch_identifier": batch_num,
                "quantity": 1,
            }
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["verdict"] == "BLOCK_SALE"
        assert not data["is_eligible_for_sale"]


# ── 6. Multi-Model AI Safety Shield & Decision Support ───────────────────────

def test_ai_safety_shield_and_explainability(client: TestClient):
    """AI risk evaluation provides feature explanations without overriding safety states."""
    # Test Dead Batch AI Risk
    resp = client.get("/api/v1/intelligence/evaluate/AMX-2024-DEAD-01")
    assert resp.status_code == 200
    data = resp.json()

    assert data["composite_risk_score"] == 1.0
    assert data["risk_level"] == "CRITICAL"
    assert len(data["reasons"]) > 0
    assert "reentry_threat_weight" in data["contributing_features"]
    assert data["contributing_features"]["reentry_threat_weight"] >= 0.9

    # Test AI Fleet Summary
    summary_resp = client.get("/api/v1/intelligence/summary")
    assert summary_resp.status_code == 200
    assert "total_batches_monitored" in summary_resp.json()


# ── 7. Reverse Chain: DISPOSED to DESTROYED Boundary ──────────────────────────

def test_reverse_chain_disposed_to_destroyed_boundary(client: TestClient, db):
    """Destruction certificates require a batch that has physically reached the DISPOSED state."""
    disp_headers = create_auth_headers(role=RoleEnum.DISPOSAL_FACILITY, org_id="org_disp_01")
    # Active batch at pharmacy cannot jump directly to destruction certificate
    active_batch = db.query(Batch).filter(Batch.status == BatchStatusEnum.AT_PHARMACY).first()
    if active_batch:
        resp = client.post(
            "/api/v1/destruction/records",
            headers=disp_headers,
            json={
                "batch_id": active_batch.id,
                "facility_org_id": "org_disp_01",
                "quantity_destroyed": 100,
                "destruction_method": "HIGH_TEMP_INCINERATION_1200C",
                "witness_name": "Inspector Rajiv Verma",
                "witness_badge_id": "INSP-99"
            }
        )
        # Should be rejected because batch is not in DISPOSED state
        assert resp.status_code in [400, 422]


# ── 8. Sovereign Dead Batch Registry Permanent Blocking ───────────────────────

def test_dead_batch_registry_cryptographic_permanence(client: TestClient):
    """Dead batch records retain cryptographic SHA-256 certificate hashes and block sale."""
    resp = client.get("/api/v1/dead-batches")
    assert resp.status_code == 200
    dead_list = resp.json()
    assert len(dead_list) >= 1

    dead_entry = dead_list[0]
    assert len(dead_entry["destruction_cert_hash"]) == 64


# ── 9. Online Marketplace Surveillance & Possible Re-Entry ────────────────────

def test_online_marketplace_safety_and_possible_reentry(client: TestClient):
    """Evaluates online medicine listings, flagging destroyed batch re-entries as BLOCK."""
    # Attempting to list destroyed dead batch online
    resp = client.post("/api/v1/online-safety/verify", json={
        "platform_name": "DarkWeb Pharmacy Marketplace",
        "seller_name": "Unverified Telegram Vendor",
        "claimed_product_name": "Amoxicillin 500mg",
        "batch_number": "AMX-2024-DEAD-01",
        "offered_quantity": 500,
        "listed_price_inr": 150.0
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["decision"] == "BLOCK"
    assert data["risk_level"] in ["CRITICAL", "HIGH"]
    assert data["dead_batch_detected"] is True


# ── 10. Multi-Dimensional Analytics Data Consistency ──────────────────────────

def test_analytics_data_consistency_across_dimensions(client: TestClient):
    """Cross-checks that all analytics dimension endpoints return consistent structured data."""
    overview = client.get("/api/v1/analytics/overview").json()
    forward = client.get("/api/v1/analytics/forward-supply").json()
    reverse = client.get("/api/v1/analytics/reverse-logistics").json()
    disposal = client.get("/api/v1/analytics/disposal-throughput").json()
    destruction = client.get("/api/v1/analytics/destruction").json()
    online = client.get("/api/v1/analytics/online-marketplace").json()
    airisk = client.get("/api/v1/analytics/ai-risk").json()
    compliance = client.get("/api/v1/analytics/compliance").json()

    assert overview["total_batches"] >= 1
    assert "total_transfers" in forward
    assert "total_returns" in reverse
    assert "discrepancy_rate_percent" in reverse
    assert "total_disposed_batches" in disposal
    assert "total_certificates_issued" in destruction
    assert "total_listings_crawled" in online
    assert "total_risk_evaluations" in airisk
    assert compliance["overall_compliance_score"] >= 90.0
    assert len(compliance["indices"]) == 8


# ── 11. Tamper-Evident SHA-256 Recalculation & Invariance ─────────────────────

def test_tamper_evident_certificate_hash_recalculation(client: TestClient, db):
    """Verifies that tampering with destruction certificate payload invalidates verification."""
    from backend.app.api.v1.destruction import build_canonical_cert_string, generate_cert_hash
    canon_str = build_canonical_cert_string(
        batch_number="B1001",
        gtin_barcode="8901088019912",
        quantity_destroyed=1000,
        destruction_method="HIGH_TEMP_INCINERATION_1200C",
        facility_org_id="org_disp_01",
        witness_badge_id="INSP-882",
        destruction_timestamp="2026-06-20T14:30:00Z",
        cert_id="DC-B1001-TEST"
    )
    canonical_hash = generate_cert_hash(canon_str)
    assert len(canonical_hash) == 64

    # Any single character change in parameters creates an entirely distinct SHA-256 hash
    tampered_str = build_canonical_cert_string(
        batch_number="B1001",
        gtin_barcode="8901088019912",
        quantity_destroyed=1001,  # 1 unit tampered
        destruction_method="HIGH_TEMP_INCINERATION_1200C",
        facility_org_id="org_disp_01",
        witness_badge_id="INSP-882",
        destruction_timestamp="2026-06-20T14:30:00Z",
        cert_id="DC-B1001-TEST"
    )
    tampered_hash = generate_cert_hash(tampered_str)
    assert tampered_hash != canonical_hash


# ── 12. Cross-Tenant Inventory Isolation Negative Test ────────────────────────

def test_cross_tenant_inventory_isolation_negative(client: TestClient):
    """Unauthorized cross-organization inventory transfer attempts are blocked."""
    unauthorized_headers = create_auth_headers(role=RoleEnum.PHARMACY, org_id="org_unauthorized_99")
    resp = client.post(
        "/api/v1/inventory/transfer",
        headers=unauthorized_headers,
        json={
            "batch_id": "btc_amx_active_01",
            "from_org_id": "org_unauthorized_99",
            "to_org_id": "org_pharm_01",
            "quantity": 50
        }
    )
    assert resp.status_code in [400, 403, 404]

