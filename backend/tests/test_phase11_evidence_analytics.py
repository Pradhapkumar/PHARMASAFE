"""
Phase 11 Automated Test Suite — Advanced Evidence + Analytics.

Validates:
  1. Centralized Evidence Management & Storage Abstraction
  2. SHA-256 Tamper-Evident Integrity Fingerprints
  3. Finalized Evidence Immutability & Deletion Protection
  4. OCR Field Parsing, Authoritative DB Comparison & Mismatch Detection
  5. Preliminary Computer Vision Image Sharpness Screening
  6. Investigation Case Workflow, Assignee, and Lifecycle Transitions
  7. Append-Only Investigator Notes
  8. Master Demonstration 360-Degree Investigation Dossier for B1001
  9. Advanced Analytics Across 8 Dimensions (Overview, Reverse, Disposal, Destruction, Online Safety, Compliance)
  10. Forensic Report Generation
  11. Deterministic Safety Rule Invariance Preservation
"""
import io
import pytest
from fastapi.testclient import TestClient
from backend.app.models.batch import Batch, BatchStatusEnum
from backend.app.models.evidence import Evidence, EvidenceTypeEnum, EvidenceStatusEnum, OCRStatusEnum
from backend.app.models.investigation import InvestigationCase, CasePriorityEnum, CaseStatusEnum
from backend.app.services.evidence_storage import evidence_storage
from backend.app.services.ocr_service import ocr_service
from backend.app.services.vision_service import vision_service


def test_evidence_storage_sha256_integrity():
    """Verify that evidence storage computes deterministic SHA-256 fingerprints."""
    sample_bytes = b"PHARMASAFE_EVIDENCE_PAYLOAD_TEST_2026"
    storage_ref, checksum, file_size = evidence_storage.save(
        file_bytes=sample_bytes,
        filename="sample_manifest.pdf",
        subfolder="tests"
    )
    assert storage_ref.startswith("/storage/")
    assert len(checksum) == 64
    assert file_size == len(sample_bytes)

    # Re-retrieve and check integrity
    retrieved = evidence_storage.retrieve(storage_ref)
    assert retrieved == sample_bytes
    assert evidence_storage.compute_sha256(retrieved) == checksum


def test_finalized_evidence_deletion_protection():
    """Verify that finalized compliance evidence cannot be deleted (HTTP 403)."""
    with pytest.raises(Exception) as exc_info:
        evidence_storage.delete_if_allowed("/storage/dummy_cert.pdf", is_finalized=True)
    assert "permanently sealed" in str(exc_info.value)


def test_ocr_field_parsing_and_match():
    """Verify structured pharmaceutical field extraction and authoritative DB match."""
    raw_text = (
        "PHARMACEUTICAL PACKAGING INSPECTION\n"
        "Product: Paracetamol 500mg IP\n"
        "Batch No: B1001\n"
        "Mfg Date: 2026-04-01\n"
        "Expiry: 2028-08-31\n"
        "Units: 20000\n"
    )
    extracted = ocr_service.extract_structured_fields(raw_text)
    assert extracted["batch_number"] == "B1001"
    assert extracted["quantity"] == 20000
    assert "Paracetamol" in extracted["product_name"]

    # Compare against authoritative data
    authoritative = {
        "batch_number": "B1001",
        "product_name": "Paracetamol 500mg IP",
        "quantity": 20000
    }
    result = ocr_service.compare_with_authoritative_data(extracted, authoritative)
    assert result["verdict"] == "MATCH"
    assert result["decision"] == "VERIFIED"
    assert result["field_comparisons"]["batch_number"]["status"] == "MATCH"


def test_ocr_field_mismatch_detection():
    """Verify that an altered batch number produces MISMATCH without labeling counterfeit."""
    extracted = {
        "batch_number": "B1003",
        "product_name": "Paracetamol 500mg IP",
        "quantity": 1000
    }
    authoritative = {
        "batch_number": "B1001",
        "product_name": "Paracetamol 500mg IP",
        "quantity": 1000
    }
    result = ocr_service.compare_with_authoritative_data(extracted, authoritative)
    assert result["verdict"] == "MISMATCH"
    assert result["decision"] == "REVIEW_REQUIRED"
    assert result["field_comparisons"]["batch_number"]["status"] == "MISMATCH"
    assert "Discrepancy detected" in result["explanation"]


def test_ocr_unavailable_fallback():
    """Verify graceful degradation when OCR text is empty or unavailable."""
    extracted = ocr_service.extract_structured_fields("")
    assert extracted["batch_number"] is None

    result = ocr_service.compare_with_authoritative_data(extracted, {"batch_number": "B1001"})
    assert result["verdict"] == "INSUFFICIENT_DATA"
    assert result["decision"] == "MANUAL_REVIEW_REQUIRED"


def test_vision_screening_analysis():
    """Verify preliminary vision screening computes blur and quality metrics."""
    # Create simple dummy byte buffer
    dummy_bytes = b"GIF89a\x01\x00\x01\x00\x80\x00\x00\xff\xff\xff\x00\x00\x00!\xf9\x04\x01\x00\x00\x00\x00,\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00;"
    screening = vision_service.analyze_package_image(dummy_bytes, "test.gif")
    assert "screening_result" in screening
    assert "quality_score" in screening
    assert "Preliminary automated screening only" in screening["claims_notice"]


def test_api_evidence_upload_and_list(client: TestClient, admin_token: str):
    """Test POST /api/v1/evidence and GET /api/v1/evidence."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    fake_file = io.BytesIO(b"BATCH: AMX-2026-001\nEXPIRY: 2027-12-31\nPRODUCT: Amoxicillin 500mg\n")
    response = client.post(
        "/api/v1/evidence",
        files={"file": ("amx_package.txt", fake_file, "text/plain")},
        data={
            "entity_type": "BATCH",
            "entity_id": "AMX-2026-001",
            "evidence_type": "PACKAGING_IMAGE",
            "description": "Packaging photo uploaded during QA inspection."
        },
        headers=headers
    )
    assert response.status_code == 201
    data = response.json()
    assert data["entity_id"] == "AMX-2026-001"
    assert len(data["checksum"]) == 64
    assert data["checksum_algorithm"] == "SHA-256"
    assert data["evidence_id"].startswith("EV-")

    # List evidence
    list_resp = client.get("/api/v1/evidence?entity_id=AMX-2026-001")
    assert list_resp.status_code == 200
    items = list_resp.json()
    assert len(items) >= 1
    assert any(item["entity_id"] == "AMX-2026-001" for item in items)


def test_api_package_comparison_endpoint(client: TestClient):
    """Test POST /api/v1/evidence/compare-package sandbox."""
    payload = {
        "batch_number": "B1001",
        "simulated_ocr_text": "PRODUCT: Paracetamol 500mg IP\nBATCH: B1001\nQUANTITY: 20000"
    }
    response = client.post("/api/v1/evidence/compare-package", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["verdict"] == "MATCH"
    assert data["authoritative_batch_number"] == "B1001"
    assert data["field_comparisons"]["batch_number"]["status"] == "MATCH"


def test_api_package_comparison_mismatch_endpoint(client: TestClient):
    """Test POST /api/v1/evidence/compare-package with mismatch."""
    payload = {
        "batch_number": "B1001",
        "simulated_ocr_text": "PRODUCT: Paracetamol 500mg IP\nBATCH: B9999\nQUANTITY: 20000"
    }
    response = client.post("/api/v1/evidence/compare-package", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["verdict"] == "MISMATCH"
    assert data["decision"] == "REVIEW_REQUIRED"


def test_investigation_case_workflow(client: TestClient, admin_token: str):
    """Test creating, querying, and transitioning investigation cases."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    # Create Case
    create_payload = {
        "title": "Suspected Label Tampering in Transit",
        "priority": "HIGH",
        "entity_type": "BATCH",
        "entity_id": "AMX-2026-001",
        "summary": "Driver reported carton seal broken during unloading at regional hub.",
        "assigned_to_name": "Special Agent Inspector Rao"
    }
    resp = client.post("/api/v1/investigations", json=create_payload, headers=headers)
    assert resp.status_code == 201
    case_data = resp.json()
    case_id = case_data["case_id"]
    assert case_id.startswith("INV-")
    assert case_data["status"] == "OPEN"

    # Append Note
    note_payload = {"note": "Physical inspection initiated. Hologram seal appears intact; secondary box damaged."}
    note_resp = client.post(f"/api/v1/investigations/{case_id}/notes", json=note_payload, headers=headers)
    assert note_resp.status_code == 201
    assert "Hologram seal" in note_resp.json()["note"]

    # Transition Status
    update_payload = {
        "status": "UNDER_REVIEW",
        "findings": "Preliminary review confirms package carton was dented, no chemical tampering."
    }
    patch_resp = client.patch(f"/api/v1/investigations/{case_id}/status", json=update_payload, headers=headers)
    assert patch_resp.status_code == 200
    assert patch_resp.json()["status"] == "UNDER_REVIEW"


def test_master_b1001_investigation_dossier(client: TestClient):
    """Verify full 360-degree Master Investigation Dossier for B1001."""
    response = client.get("/api/v1/investigations/INV-2026-B1001")
    assert response.status_code == 200
    dossier = response.json()

    assert dossier["case_id"] == "INV-2026-B1001"
    assert dossier["priority"] == "CRITICAL"
    assert dossier["risk_level"] == "CRITICAL"
    assert dossier["risk_score"] == 1.0

    # Verify timeline phases are present
    timeline = dossier["timeline"]
    assert len(timeline) >= 4
    phases = [t["phase"] for t in timeline]
    assert any("MANUFACTURING" in p for p in phases)
    assert any("DISPOSAL" in p or "REVERSE" in p for p in phases)
    assert any("DESTRUCTION" in p for p in phases)
    assert any("DEAD BATCH" in p for p in phases)

    # Verify linked evidence artifacts
    evidence_items = dossier["evidence_items"]
    assert len(evidence_items) >= 4
    for ev in evidence_items:
        assert len(ev["checksum"]) == 64

    # Verify append-only investigator notes
    notes = dossier["notes"]
    assert len(notes) >= 4
    assert any("Vikram Malhotra" in n["author_name"] for n in notes)

    # Verify provenance custody chain
    custody = dossier["custody_chain"]
    assert len(custody) >= 2


def test_analytics_endpoints(client: TestClient):
    """Test all Phase 11 analytics endpoints."""
    # 1. Overview
    overview = client.get("/api/v1/analytics/overview").json()
    assert overview["total_batches"] > 0
    assert overview["fleet_risk_index"] > 0
    assert overview["system_compliance_score"] >= 90.0

    # 2. Reverse Logistics
    reverse = client.get("/api/v1/analytics/reverse-logistics").json()
    assert "total_returns" in reverse
    assert "discrepancy_rate_percent" in reverse
    assert len(reverse["monthly_trend"]) > 0

    # 3. Disposal
    disposal = client.get("/api/v1/analytics/disposal").json()
    assert "total_disposed_batches" in disposal
    assert len(disposal["by_method"]) > 0

    # 4. Destruction
    destruction = client.get("/api/v1/analytics/destruction").json()
    assert destruction["hash_integrity_rate_percent"] == 100.0
    assert destruction["dead_batch_closure_rate_percent"] == 100.0

    # 5. Online Safety
    online = client.get("/api/v1/analytics/online-safety").json()
    assert "total_listings_crawled" in online
    assert len(online["decision_distribution"]) > 0

    # 6. Compliance
    compliance = client.get("/api/v1/analytics/compliance").json()
    assert compliance["overall_compliance_score"] >= 95.0
    assert len(compliance["indices"]) == 8

    # 7. Geospatial
    geo = client.get("/api/v1/analytics/geospatial").json()
    assert len(geo) >= 4
    for node in geo:
        assert node["location_type"] == "RECORDED LOCATION"
        assert -90 <= node["lat"] <= 90
        assert -180 <= node["lng"] <= 180


def test_report_generation_for_batch_b1001(client: TestClient):
    """Test generating full forensic investigation report for B1001."""
    resp = client.post("/api/v1/reports/batch/B1001")
    assert resp.status_code == 200
    report = resp.json()

    assert report["report_id"].startswith("REP-")
    assert "B1001" in report["report_title"]
    assert "PROTOTYPE COMPLIANCE REPORT" in report["regulatory_notice"]
    assert "deterministic_shield_active" in report
    assert report["evidence_count"] >= 4
    assert len(report["timeline"]) >= 4


def test_deterministic_safety_invariant_under_investigation(client: TestClient, db):
    """
    CRITICAL INVARIANT TEST:
    Even under active investigation, a destroyed dead batch cannot have its
    statutory sale-blocking bypassed or lowered.
    """
    dead_batch = db.query(Batch).filter(Batch.batch_number == "AMX-2024-DEAD-01").first()
    assert dead_batch.status in [BatchStatusEnum.DEAD_BATCH, BatchStatusEnum.DESTROYED]

    # AI evaluation must still yield 1.0 CRITICAL
    ai_resp = client.get(f"/api/v1/intelligence/evaluate/{dead_batch.batch_number}").json()
    assert ai_resp["composite_risk_score"] == 1.0
    assert ai_resp["risk_level"] == "CRITICAL"
    assert any("Dead Batch" in r or "Deterministic" in r or "DESTROYED" in r for r in ai_resp["reasons"])
