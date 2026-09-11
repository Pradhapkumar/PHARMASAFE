from datetime import date, timedelta

def test_list_batches(client):
    response = client.get("/api/v1/batches")
    assert response.status_code == 200
    batches = response.json()
    assert len(batches) >= 4

def test_create_batch_as_manufacturer(client, manufacturer_token):
    today = date.today()
    batch_payload = {
        "batch_number": "AMX-TEST-2026-X1",
        "gtin_barcode": "8901088019999",
        "medicine_id": "med_amox_500",
        "mfg_date": today.isoformat(),
        "expiry_date": (today + timedelta(days=365)).isoformat(),
        "initial_quantity": 5000,
        "unit": "BOX"
    }
    response = client.post(
        "/api/v1/batches",
        json=batch_payload,
        headers={"Authorization": f"Bearer {manufacturer_token}"}
    )
    assert response.status_code == 201
    data = response.json()
    assert data["batch_number"] == "AMX-TEST-2026-X1"
    assert data["status"] == "MANUFACTURED"

def test_pharmacy_cannot_create_batch(client, pharmacy_token):
    today = date.today()
    batch_payload = {
        "batch_number": "AMX-UNAUTHORIZED-01",
        "gtin_barcode": "8901088010000",
        "medicine_id": "med_amox_500",
        "mfg_date": today.isoformat(),
        "expiry_date": (today + timedelta(days=365)).isoformat(),
        "initial_quantity": 5000,
        "unit": "BOX"
    }
    response = client.post(
        "/api/v1/batches",
        json=batch_payload,
        headers={"Authorization": f"Bearer {pharmacy_token}"}
    )
    assert response.status_code == 403

def test_get_batch_passport(client):
    response = client.get("/api/v1/batches/AMX-2026-001/passport")
    assert response.status_code == 200
    data = response.json()
    assert data["batch_number"] == "AMX-2026-001"
    assert data["medicine"]["brand_name"] == "Amoxil 500mg"
    assert len(data["custody_history"]) >= 2
