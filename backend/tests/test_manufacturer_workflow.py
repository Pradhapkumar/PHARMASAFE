"""
Tests for Phase 4: Manufacturer Workflow and Digital Batch Passport.
Verifies batch creation validations, automatic inventory initialization,
event history aggregation, manufacturer dashboard, and RBAC.
"""
from datetime import date, timedelta
import pytest


def test_batch_creation_validation_expiry_before_mfg(client, manufacturer_token):
    """Batch creation must fail if expiry_date <= mfg_date."""
    today = date.today()
    past = today - timedelta(days=30)
    response = client.post(
        "/api/v1/batches",
        headers={"Authorization": f"Bearer {manufacturer_token}"},
        json={
            "batch_number": "BAT-INVALID-EXPIRY-01",
            "gtin_barcode": "8901088999901",
            "medicine_id": "med_paracetamol_500",
            "mfg_date": today.isoformat(),
            "expiry_date": past.isoformat(),
            "initial_quantity": 500,
            "unit": "BOX"
        }
    )
    assert response.status_code == 400
    assert "Expiry date must be after manufacturing date" in response.json()["detail"]


def test_batch_creation_validation_zero_quantity(client, manufacturer_token):
    """Batch creation must fail if quantity <= 0."""
    today = date.today()
    future = today + timedelta(days=365)
    response = client.post(
        "/api/v1/batches",
        headers={"Authorization": f"Bearer {manufacturer_token}"},
        json={
            "batch_number": "BAT-INVALID-QTY-01",
            "gtin_barcode": "8901088999902",
            "medicine_id": "med_paracetamol_500",
            "mfg_date": today.isoformat(),
            "expiry_date": future.isoformat(),
            "initial_quantity": 0,
            "unit": "BOX"
        }
    )
    assert response.status_code in [400, 422]


def test_batch_creation_creates_inventory_and_events(client, manufacturer_token):
    """Creating a batch must initialize manufacturer inventory and log lifecycle events."""
    today = date.today()
    future = today + timedelta(days=730)
    batch_no = f"MFG-TEST-{int(today.strftime('%Y%m%d'))}-99"

    res = client.post(
        "/api/v1/batches",
        headers={"Authorization": f"Bearer {manufacturer_token}"},
        json={
            "batch_number": batch_no,
            "gtin_barcode": "8901088999903",
            "medicine_id": "med_paracet_500",
            "mfg_date": today.isoformat(),
            "expiry_date": future.isoformat(),
            "initial_quantity": 1200,
            "unit": "BOX"
        }
    )
    assert res.status_code == 201
    batch_data = res.json()
    batch_id = batch_data["id"]
    assert batch_data["batch_number"] == batch_no
    assert batch_data["status"] == "MANUFACTURED"

    # Verify inventory was created for manufacturer
    inv_res = client.get(
        f"/api/v1/inventory?batch_id={batch_id}",
        headers={"Authorization": f"Bearer {manufacturer_token}"}
    )
    assert inv_res.status_code == 200
    inventories = inv_res.json()
    matching_inv = [i for i in inventories if i["batch_id"] == batch_id]
    assert len(matching_inv) >= 1
    assert matching_inv[0]["quantity_available"] == 1200

    # Verify GET /api/v1/batches/{batch_id} works
    get_res = client.get(f"/api/v1/batches/{batch_id}")
    assert get_res.status_code == 200
    assert get_res.json()["batch_number"] == batch_no

    # Verify GET /api/v1/batches/{batch_id}/events contains MANUFACTURED
    events_res = client.get(f"/api/v1/batches/{batch_id}/events")
    assert events_res.status_code == 200
    events = events_res.json()
    assert len(events) >= 1
    assert events[0]["event_type"] == "MANUFACTURED"
    assert events[0]["quantity"] == 1200


def test_get_batch_passport_structure(client):
    """Digital batch passport must return complete metadata for B1001."""
    res = client.get("/api/v1/batches/B1001/passport")
    assert res.status_code == 200
    passport = res.json()

    assert passport["batch_number"] == "B1001"
    assert "medicine" in passport
    assert passport["medicine"]["brand_name"] is not None
    assert passport["initial_quantity"] >= 1000
    assert "status" in passport
    assert "manufacturer_name" in passport


def test_manufacturer_dashboard_endpoint(client, manufacturer_token):
    """GET /api/v1/dashboard/manufacturer must return real manufacturer stats."""
    res = client.get(
        "/api/v1/dashboard/manufacturer",
        headers={"Authorization": f"Bearer {manufacturer_token}"}
    )
    assert res.status_code == 200
    dash = res.json()

    assert "total_batches" in dash
    assert "active_batches" in dash
    assert "total_units_manufactured" in dash
    assert "recent_batches" in dash
    assert "status_distribution" in dash
    assert dash["total_batches"] >= 1


def test_medicines_search_and_create(client, manufacturer_token):
    """Manufacturer should be able to search and register medicines."""
    # Search
    search_res = client.get("/api/v1/medicines?search=Paracetamol")
    assert search_res.status_code == 200
    meds = search_res.json()
    assert len(meds) >= 1
    assert any("Paracetamol" in m["brand_name"] or "Paracetamol" in m["generic_name"] for m in meds)

    # Register new medicine
    new_med_res = client.post(
        "/api/v1/medicines",
        headers={"Authorization": f"Bearer {manufacturer_token}"},
        json={
            "brand_name": "PharmaSafe Zinc 50mg",
            "generic_name": "Zinc Sulfate",
            "dosage_form": "TABLET",
            "strength": "50mg",
            "composition": "Zinc Sulfate 50mg USP",
            "storage_temp_min": "15°C",
            "storage_temp_max": "30°C",
            "manufacturer_id": "org_pfizer_india"
        }
    )
    assert new_med_res.status_code == 201
    created = new_med_res.json()
    assert created["brand_name"] == "PharmaSafe Zinc 50mg"


def test_batch_search_endpoint(client):
    """Search query on GET /api/v1/batches should find matching batches."""
    res = client.get("/api/v1/batches?search=B1001")
    assert res.status_code == 200
    batches = res.json()
    assert len(batches) >= 1
    assert any(b["batch_number"] == "B1001" for b in batches)
