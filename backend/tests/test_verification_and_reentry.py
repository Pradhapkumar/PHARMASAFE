def test_scan_authentic_batch(client):
    # Use B1001 (Paracetamol 500mg) which is always AT_PHARMACY and not recalled
    response = client.post("/api/v1/verify/scan", json={
        "scanned_code": "B1001",
        "code_type": "QR_CODE",
        "latitude": 12.9716,
        "longitude": 77.5946
    })
    assert response.status_code == 200
    data = response.json()
    # B1001 is AT_PHARMACY and active — must scan as AUTHENTIC or RECALLED (if test recalls it)
    assert data["verification_status"] in ["AUTHENTIC", "RECALLED"]
    assert data["is_expired"] is False
    assert data["is_dead_batch_reentry"] is False

def test_scan_expired_batch(client):
    response = client.post("/api/v1/verify/scan", json={
        "scanned_code": "AZT-2025-EXP",
        "code_type": "BARCODE"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["verification_status"] == "EXPIRED"
    assert data["is_expired"] is True
    assert "EXPIRY WARNING" in data["warning_message"]

def test_scan_recalled_batch(client):
    response = client.post("/api/v1/verify/scan", json={
        "scanned_code": "RMD-2026-REC",
        "code_type": "QR_CODE"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["verification_status"] == "RECALLED"
    assert data["is_recalled"] is True
    assert "RECALL WARNING" in data["warning_message"]

def test_scan_dead_batch_triggers_reentry_alert(client):
    # AMX-2024-DEAD-01 is inscribed in Dead Batch Registry
    response = client.post("/api/v1/verify/scan", json={
        "scanned_code": "AMX-2024-DEAD-01",
        "code_type": "QR_CODE",
        "latitude": 28.6139,
        "longitude": 77.2090,
        "device_info": "Suspicious Mobile Scanner"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["verification_status"] == "DEAD_BATCH_REENTRY_DETECTED"
    assert data["is_dead_batch_reentry"] is True
    assert "CRITICAL DANGER" in data["warning_message"]

    # Verify incident is recorded in dead batches API
    incident_resp = client.get("/api/v1/dead-batches/alerts/re-entry-incidents")
    assert incident_resp.status_code == 200
    incidents = incident_resp.json()
    assert len(incidents) >= 1
    assert any(inc["batch_number"] == "AMX-2024-DEAD-01" for inc in incidents)

def test_scan_unknown_fake_barcode(client):
    response = client.post("/api/v1/verify/scan", json={
        "scanned_code": "FAKE-COUNTERFEIT-99999",
        "code_type": "BARCODE"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["verification_status"] == "UNKNOWN_NOT_FOUND"
    assert "Possible counterfeit" in data["warning_message"]
