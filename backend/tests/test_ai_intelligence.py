def test_batch_risk_score_computation(client):
    response = client.get("/api/v1/intelligence/risk-score/AMX-2026-001")
    assert response.status_code == 200
    data = response.json()
    assert "composite_risk_score" in data
    assert data["composite_risk_score"] < 0.35
    assert data["risk_level"] == "LOW"

def test_dead_batch_risk_score_is_critical(client):
    response = client.get("/api/v1/intelligence/risk-score/AMX-2024-DEAD-01")
    assert response.status_code == 200
    data = response.json()
    assert data["composite_risk_score"] >= 0.90
    assert data["risk_level"] == "CRITICAL"

def test_ingest_online_surveillance_with_dead_batch(client):
    listing_payload = {
        "platform_name": "DarkNetRx_Hub",
        "listing_url": "https://darknetrx.onion/item/9912",
        "seller_name": "AnonSupplier_99",
        "medicine_brand_claimed": "Amoxil 500mg",
        "extracted_batch_number": "AMX-2024-DEAD-01",
        "listed_price_inr": 80.0,
        "discount_percentage": 85.0
    }
    response = client.post("/api/v1/intelligence/online-surveillance", json=listing_payload)
    assert response.status_code == 201
    data = response.json()
    assert data["is_dead_batch_match"] is True
    assert data["risk_level"] == "CRITICAL"
    assert data["risk_score"] == 1.0

def test_compliance_summary_report(client):
    response = client.get("/api/v1/audit/compliance/summary")
    assert response.status_code == 200
    data = response.json()
    assert data["total_active_batches"] >= 1
    assert data["total_destroyed_dead_batches"] >= 1
    assert data["overall_system_integrity_score"] > 0
