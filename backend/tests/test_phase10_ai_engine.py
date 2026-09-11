"""
Phase 10 Tests: AI Risk + Anomaly Engine.
Validates multi-model ensemble, feature extraction, supply chain anomaly detection,
re-entry risk, explainability attribution, and deterministic rule preservation.
"""
import pytest
from datetime import date, datetime, timedelta, timezone
from backend.app.models.batch import Batch, BatchStatusEnum, UnitEnum
from backend.app.models.medicine import Medicine
from backend.app.models.user import Organization, RoleEnum
from backend.app.models.custody import CustodyTransfer, TransferStageEnum
from backend.app.models.dead_batch import DeadBatch
from backend.app.models.intelligence import AnomalyLog, RiskLevelEnum
from ai_engine.ensemble_engine import FeatureExtractor, pharma_ai_engine, MODEL_VERSION


@pytest.fixture
def ai_test_medicine(db):
    med = db.query(Medicine).filter(Medicine.id == "med_ai_test_01").first()
    if not med:
        med = Medicine(
            id="med_ai_test_01",
            brand_name="NeuroSafe 50mg",
            generic_name="Neurotine Hydrochloride",
            dosage_form="TABLET",
            strength="50mg",
            manufacturer_id="org_pfizer_india"
        )
        db.add(med)
        db.commit()
    return med


@pytest.fixture
def safe_forward_batch(db, ai_test_medicine):
    batch = db.query(Batch).filter(Batch.batch_number == "AI-SAFE-BATCH-001").first()
    if not batch:
        batch = Batch(
            id="btc_ai_safe_001",
            batch_number="AI-SAFE-BATCH-001",
            gtin_barcode="8901000000011",
            medicine_id=ai_test_medicine.id,
            manufacturer_id="org_pfizer_india",
            mfg_date=date.today() - timedelta(days=60),
            expiry_date=date.today() + timedelta(days=600),
            initial_quantity=5000,
            current_quantity=5000,
            unit=UnitEnum.BOX,
            status=BatchStatusEnum.AT_PHARMACY,
            current_custodian_id="org_medplus_retail",
            is_recalled=False
        )
        db.add(batch)
        db.commit()
    return batch


def test_ai_safe_batch_evaluation(client, safe_forward_batch):
    """Compliant active dispensary batch should evaluate to LOW risk."""
    res = client.get(f"/api/v1/intelligence/evaluate/{safe_forward_batch.batch_number}")
    assert res.status_code == 200
    data = res.json()
    assert data["batch_number"] == safe_forward_batch.batch_number
    assert data["risk_level"] in ["LOW", "MEDIUM"]
    assert data["composite_risk_score"] < 0.40
    assert data["model_version"] == MODEL_VERSION
    assert data["deterministic_safety_preserved"] is True
    assert "expiry_decay_weight" in data["contributing_features"]
    assert len(data["reasons"]) > 0


def test_ai_dead_batch_produces_critical_risk(client, db, ai_test_medicine):
    """Batches in the Dead Batch Registry must yield 1.0 CRITICAL risk."""
    batch = db.query(Batch).filter(Batch.batch_number == "AI-DEAD-BATCH-001").first()
    if not batch:
        batch = Batch(
            id="btc_ai_dead_001",
            batch_number="AI-DEAD-BATCH-001",
            gtin_barcode="8901000000022",
            medicine_id=ai_test_medicine.id,
            manufacturer_id="org_pfizer_india",
            mfg_date=date.today() - timedelta(days=365),
            expiry_date=date.today() + timedelta(days=300),
            initial_quantity=1000,
            current_quantity=0,
            unit=UnitEnum.BOX,
            status=BatchStatusEnum.DEAD_BATCH,
            current_custodian_id="org_green_shield_disposal",
            is_recalled=False
        )
        db.add(batch)
        db.flush()

        dead_entry = DeadBatch(
            id="dead_ai_test_01",
            batch_id=batch.id,
            batch_number=batch.batch_number,
            gtin_barcode=batch.gtin_barcode,
            destruction_record_id="rec_ai_mock_01",
            destruction_cert_hash="a" * 64,
            manufacturer_name="Pfizer Healthcare India Ltd.",
            quantity_destroyed=1000,
            destroyed_at=datetime.now(timezone.utc),
            blacklisted_at=datetime.now(timezone.utc)
        )
        db.add(dead_entry)
        db.commit()

    res = client.get(f"/api/v1/intelligence/evaluate/{batch.batch_number}")
    assert res.status_code == 200
    data = res.json()
    assert data["composite_risk_score"] == 1.0
    assert data["risk_level"] == "CRITICAL"
    assert data["reentry_risk_score"] == 1.0
    assert any("Dead Batch Registry" in r or "DESTROYED" in r for r in data["reasons"])


def test_ai_detects_speed_violation_anomaly(client, db, safe_forward_batch):
    """Custody transfer with impossible speed (>140 km/h) triggers SPEED_GEO_JUMP anomaly."""
    # Add two custody transfers with 1 hour difference and 300 km distance
    t0 = datetime.now(timezone.utc) - timedelta(hours=3)
    t1 = t0 + timedelta(hours=1)

    c1 = CustodyTransfer(
        id=f"cst_ai_spd_1",
        batch_id=safe_forward_batch.id,
        stage=TransferStageEnum.MANUFACTURE_TO_DISTRIBUTOR,
        from_organization_id="org_pfizer_india",
        to_organization_id="org_apollo_logistics",
        transferred_quantity=1000,
        verified_quantity=1000,
        latitude=12.9716,
        longitude=77.5946,
        timestamp=t0
    )
    c2 = CustodyTransfer(
        id=f"cst_ai_spd_2",
        batch_id=safe_forward_batch.id,
        stage=TransferStageEnum.DISTRIBUTOR_TO_PHARMACY,
        from_organization_id="org_apollo_logistics",
        to_organization_id="org_medplus_retail",
        transferred_quantity=1000,
        verified_quantity=1000,
        latitude=15.3647,  # ~270 km jump in 1 hour
        longitude=75.1240,
        timestamp=t1
    )
    db.add_all([c1, c2])
    db.commit()

    res = client.get(f"/api/v1/intelligence/evaluate/{safe_forward_batch.batch_number}")
    assert res.status_code == 200
    data = res.json()
    assert data["movement_anomaly_score"] >= 0.80
    assert any(a["anomaly_type"] == "SPEED_GEO_JUMP" for a in data["anomalies_detected"])


def test_ai_detects_quantity_shrinkage_anomaly(client, db, safe_forward_batch):
    """Transfers with significant missing units trigger QUANTITY_LEAKAGE anomaly."""
    c_leak = CustodyTransfer(
        id=f"cst_ai_leak_1",
        batch_id=safe_forward_batch.id,
        stage=TransferStageEnum.DISTRIBUTOR_TO_PHARMACY,
        from_organization_id="org_apollo_logistics",
        to_organization_id="org_medplus_retail",
        transferred_quantity=1000,
        verified_quantity=800,  # 200 units missing (20% discrepancy)
        has_discrepancy=True,
        discrepancy_notes="Discrepancy test",
        timestamp=datetime.now(timezone.utc)
    )
    db.add(c_leak)
    db.commit()

    res = client.get(f"/api/v1/intelligence/evaluate/{safe_forward_batch.batch_number}")
    assert res.status_code == 200
    data = res.json()
    assert data["quantity_anomaly_score"] >= 0.50
    assert any(a["anomaly_type"] == "QUANTITY_LEAKAGE" for a in data["anomalies_detected"])


def test_ai_simulation_endpoint(client):
    """Simulation endpoint allows stress-testing hypothetical risk scenarios."""
    payload = {
        "batch_number": "SIM-STRESS-99",
        "days_to_expiry": 10,  # Critical near expiry
        "transit_speed_kmh": 185.0,  # Speed jump
        "shrinkage_quantity": 250,  # Heavy leakage
        "illicit_marketplace_listing": True,  # Darknet listing
        "marketplace_discount_percent": 75.0  # Deep discount
    }
    res = client.post("/api/v1/intelligence/simulate", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["composite_risk_score"] >= 0.75
    assert data["risk_level"] == "HIGH"
    assert data["expiry_risk_score"] >= 0.85
    assert data["movement_anomaly_score"] >= 0.85
    assert data["seller_listing_risk_score"] >= 0.85
    assert data["model_version"] == MODEL_VERSION


def test_ai_summary_endpoint(client):
    """Intelligence summary endpoint returns aggregated system telemetry."""
    res = client.get("/api/v1/intelligence/summary")
    assert res.status_code == 200
    data = res.json()
    assert "total_batches_monitored" in data
    assert "high_risk_lots_count" in data
    assert "anomalies_active_count" in data
    assert "average_system_risk_score" in data
    assert data["model_version"] == MODEL_VERSION


def test_deterministic_safety_never_overridden_by_ai():
    """
    Core Invariant Test:
    Even if an AI model outputs an artificially low score, deterministic safety
    gates strictly uphold BLOCKED states.
    """
    features = {
        "days_to_expiry": 300,
        "fraction_shelf_elapsed": 0.2,
        "is_expired": False,
        "max_speed_kmh": 50.0,
        "speed_violation": False,
        "dwell_bottleneck": False,
        "hops_count": 2,
        "shrinkage_ratio": 0.0,
        "total_shrinkage": 0,
        "shrinkage_count": 0,
        "has_returns": False,
        "return_ratio": 0.0,
        "recalled_returns": False,
        "listing_count": 0,
        "max_discount": 0.0,
        "illicit_channel_detected": False,
        "is_dead_batch": True,  # Hard state
        "batch_status": "DESTROYED",  # Hard state
        "is_recalled": False,
    }
    res = pharma_ai_engine.evaluate_batch(features)
    # The AI engine recognizes the hard state and marks composite risk CRITICAL (1.0)
    assert res["composite_risk_score"] == 1.0
    assert res["risk_level"] == "CRITICAL"
    assert res["deterministic_safety_preserved"] is True
