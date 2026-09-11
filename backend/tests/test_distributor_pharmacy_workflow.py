import pytest
from datetime import date, timedelta


def test_distributor_dashboard_endpoint(client, distributor_token):
    headers = {"Authorization": f"Bearer {distributor_token}"}
    response = client.get("/api/v1/dashboard/distributor", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "total_received" in data
    assert "total_inventory" in data
    assert "pending_receiving" in data
    assert "pending_transfers" in data
    assert "discrepancies_count" in data
    assert "near_expiry_batches" in data
    assert "expired_batches" in data
    assert "incoming_shipments" in data
    assert "recent_transfers" in data


def test_pharmacy_dashboard_endpoint(client, pharmacy_token):
    headers = {"Authorization": f"Bearer {pharmacy_token}"}
    response = client.get("/api/v1/dashboard/pharmacy", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "active_stock" in data
    assert "incoming_count" in data
    assert "near_expiry_count" in data
    assert "expired_count" in data
    assert "recalled_count" in data
    assert "incoming_shipments" in data
    assert "recent_scans" in data


def test_distributor_receives_shipment_exact_match(client, manufacturer_token, distributor_token):
    mfg_headers = {"Authorization": f"Bearer {manufacturer_token}"}
    dist_headers = {"Authorization": f"Bearer {distributor_token}"}

    # 1. Manufacturer creates a new batch with 2000 units
    today = date.today()
    batch_res = client.post(
        "/api/v1/batches",
        headers=mfg_headers,
        json={
            "batch_number": "FWD-2026-001",
            "gtin_barcode": "8901088990011",
            "medicine_id": "med_paracet_500",
            "mfg_date": today.isoformat(),
            "expiry_date": (today + timedelta(days=500)).isoformat(),
            "initial_quantity": 2000,
            "unit": "BOX"
        }
    )
    assert batch_res.status_code == 201
    batch_id = batch_res.json()["id"]

    # 2. Manufacturer dispatches 800 units to Apollo Distributor (org_apollo_logistics)
    disp_res = client.post(
        "/api/v1/inventory/transfers/dispatch",
        headers=mfg_headers,
        json={
            "batch_id": batch_id,
            "to_organization_id": "org_apollo_logistics",
            "quantity": 800,
            "notes": "Standard wholesale dispatch manifest"
        }
    )
    assert disp_res.status_code == 201
    transfer_id = disp_res.json()["id"]
    assert disp_res.json()["is_confirmed"] is False
    assert disp_res.json()["transferred_quantity"] == 800

    # 3. Distributor checks incoming shipments
    inc_res = client.get("/api/v1/inventory/transfers/incoming?confirmed=false", headers=dist_headers)
    assert inc_res.status_code == 200
    incoming_ids = [t["id"] for t in inc_res.json()]
    assert transfer_id in incoming_ids

    # 4. Distributor accepts shipment with EXACT match (800 units)
    recv_res = client.post(
        f"/api/v1/inventory/transfers/{transfer_id}/receive",
        headers=dist_headers,
        json={
            "verified_quantity": 800,
            "discrepancy_notes": "All cartons scanned and counted intact."
        }
    )
    assert recv_res.status_code == 200
    recv_data = recv_res.json()
    assert recv_data["is_confirmed"] is True
    assert recv_data["verified_quantity"] == 800
    assert recv_data["has_discrepancy"] is False

    # 5. Verify distributor inventory increased by 800
    inv_res = client.get(f"/api/v1/inventory?batch_id={batch_id}", headers=dist_headers)
    assert inv_res.status_code == 200
    inv_list = inv_res.json()
    assert len(inv_list) == 1
    assert inv_list[0]["quantity_available"] == 800


def test_distributor_receives_shipment_with_quantity_discrepancy(client, manufacturer_token, distributor_token):
    mfg_headers = {"Authorization": f"Bearer {manufacturer_token}"}
    dist_headers = {"Authorization": f"Bearer {distributor_token}"}

    # 1. Manufacturer creates batch
    today = date.today()
    batch_res = client.post(
        "/api/v1/batches",
        headers=mfg_headers,
        json={
            "batch_number": "DISC-2026-002",
            "gtin_barcode": "8901088990022",
            "medicine_id": "med_paracet_500",
            "mfg_date": today.isoformat(),
            "expiry_date": (today + timedelta(days=600)).isoformat(),
            "initial_quantity": 1000,
            "unit": "BOX"
        }
    )
    assert batch_res.status_code == 201
    batch_id = batch_res.json()["id"]

    # 2. Manufacturer dispatches 800 units
    disp_res = client.post(
        "/api/v1/inventory/transfers/dispatch",
        headers=mfg_headers,
        json={
            "batch_id": batch_id,
            "to_organization_id": "org_apollo_logistics",
            "quantity": 800,
            "notes": "Manifest #DISC-800"
        }
    )
    assert disp_res.status_code == 201
    transfer_id = disp_res.json()["id"]

    # 3. Distributor receives only 780 units (variance of -20)
    recv_res = client.post(
        f"/api/v1/inventory/transfers/{transfer_id}/receive",
        headers=dist_headers,
        json={
            "verified_quantity": 780,
            "discrepancy_notes": "Damaged carton short 20 units upon physical intake inspection."
        }
    )
    assert recv_res.status_code == 200
    recv_data = recv_res.json()
    assert recv_data["is_confirmed"] is True
    assert recv_data["verified_quantity"] == 780
    assert recv_data["has_discrepancy"] is True
    assert "Variance: -20" in recv_data["discrepancy_notes"] or "-20" in recv_data["discrepancy_notes"]

    # 4. Verify HIGH Alert was automatically created
    alerts_res = client.get("/api/v1/alerts", headers=dist_headers)
    assert alerts_res.status_code == 200
    matching_alerts = [a for a in alerts_res.json() if a.get("entity_id") == transfer_id]
    assert len(matching_alerts) >= 1
    assert matching_alerts[0]["severity"] == "HIGH"
    assert matching_alerts[0]["alert_type"] == "QUANTITY_DISCREPANCY"


def test_distributor_cannot_receive_other_org_shipment(client, manufacturer_token, distributor_token):
    mfg_headers = {"Authorization": f"Bearer {manufacturer_token}"}
    dist_headers = {"Authorization": f"Bearer {distributor_token}"}

    # Manufacturer dispatches to pharmacy directly or another org
    today = date.today()
    batch_res = client.post(
        "/api/v1/batches",
        headers=mfg_headers,
        json={
            "batch_number": "SEC-2026-003",
            "gtin_barcode": "8901088990033",
            "medicine_id": "med_paracet_500",
            "mfg_date": today.isoformat(),
            "expiry_date": (today + timedelta(days=600)).isoformat(),
            "initial_quantity": 500,
            "unit": "BOX"
        }
    )
    batch_id = batch_res.json()["id"]

    # Create transfer intended for MedPlus Pharmacy (org_medplus_retail)
    from backend.tests.conftest import TestingSessionLocal
    from backend.app.models.custody import CustodyTransfer, TransferStageEnum
    import uuid
    db = TestingSessionLocal()
    fake_transfer = CustodyTransfer(
        id=f"trn_test_{uuid.uuid4().hex[:8]}",
        batch_id=batch_id,
        stage=TransferStageEnum.DISTRIBUTOR_TO_PHARMACY,
        from_organization_id="org_apollo_logistics",
        to_organization_id="org_medplus_retail",  # For pharmacy, NOT distributor
        transferred_quantity=100,
        is_confirmed=False
    )
    db.add(fake_transfer)
    db.commit()
    tf_id = fake_transfer.id
    db.close()

    # Distributor attempts to receive pharmacy shipment -> 403 Forbidden
    res = client.post(
        f"/api/v1/inventory/transfers/{tf_id}/receive",
        headers=dist_headers,
        json={"verified_quantity": 100}
    )
    assert res.status_code == 403
    assert "Access denied" in res.json()["detail"]


def test_duplicate_receiving_prevented(client, manufacturer_token, distributor_token):
    mfg_headers = {"Authorization": f"Bearer {manufacturer_token}"}
    dist_headers = {"Authorization": f"Bearer {distributor_token}"}

    # 1. Dispatch
    today = date.today()
    b_res = client.post(
        "/api/v1/batches",
        headers=mfg_headers,
        json={
            "batch_number": "DUP-2026-004",
            "gtin_barcode": "8901088990044",
            "medicine_id": "med_paracet_500",
            "mfg_date": today.isoformat(),
            "expiry_date": (today + timedelta(days=400)).isoformat(),
            "initial_quantity": 500,
            "unit": "BOX"
        }
    )
    batch_id = b_res.json()["id"]

    disp = client.post(
        "/api/v1/inventory/transfers/dispatch",
        headers=mfg_headers,
        json={
            "batch_id": batch_id,
            "to_organization_id": "org_apollo_logistics",
            "quantity": 200
        }
    )
    transfer_id = disp.json()["id"]

    # 2. First receive -> 200 OK
    recv1 = client.post(
        f"/api/v1/inventory/transfers/{transfer_id}/receive",
        headers=dist_headers,
        json={"verified_quantity": 200}
    )
    assert recv1.status_code == 200

    # 3. Second receive attempt -> 409 Conflict
    recv2 = client.post(
        f"/api/v1/inventory/transfers/{transfer_id}/receive",
        headers=dist_headers,
        json={"verified_quantity": 200}
    )
    assert recv2.status_code == 409
    assert "ALREADY_RECEIVED" in recv2.json()["detail"]


def test_distributor_transfer_to_pharmacy_and_pharmacy_receive(
    client, manufacturer_token, distributor_token, pharmacy_token
):
    mfg_headers = {"Authorization": f"Bearer {manufacturer_token}"}
    dist_headers = {"Authorization": f"Bearer {distributor_token}"}
    pharm_headers = {"Authorization": f"Bearer {pharmacy_token}"}

    # STEP 1: Manufacturer creates batch (1000 units)
    today = date.today()
    b_res = client.post(
        "/api/v1/batches",
        headers=mfg_headers,
        json={
            "batch_number": "FLOW-2026-B1001",
            "gtin_barcode": "8901088771122",
            "medicine_id": "med_paracet_500",
            "mfg_date": today.isoformat(),
            "expiry_date": (today + timedelta(days=700)).isoformat(),
            "initial_quantity": 1000,
            "unit": "BOX"
        }
    )
    batch_id = b_res.json()["id"]

    # STEP 2: Manufacturer dispatches 800 units to Distributor
    mfg_disp = client.post(
        "/api/v1/inventory/transfers/dispatch",
        headers=mfg_headers,
        json={
            "batch_id": batch_id,
            "to_organization_id": "org_apollo_logistics",
            "quantity": 800,
            "notes": "Truck #MH-04-1234"
        }
    )
    assert mfg_disp.status_code == 201
    mfg_tf_id = mfg_disp.json()["id"]

    # STEP 3: Distributor receives 800 units
    dist_recv = client.post(
        f"/api/v1/inventory/transfers/{mfg_tf_id}/receive",
        headers=dist_headers,
        json={"verified_quantity": 800}
    )
    assert dist_recv.status_code == 200

    # Check distributor inventory = 800
    d_inv = client.get(f"/api/v1/inventory?batch_id={batch_id}", headers=dist_headers)
    assert d_inv.json()[0]["quantity_available"] == 800

    # STEP 4: Distributor dispatches 500 units to MedPlus Pharmacy
    dist_disp = client.post(
        "/api/v1/inventory/transfers/dispatch",
        headers=dist_headers,
        json={
            "batch_id": batch_id,
            "to_organization_id": "org_medplus_retail",
            "quantity": 500,
            "notes": "Delivery Van #KA-01-5678"
        }
    )
    assert dist_disp.status_code == 201
    dist_tf_id = dist_disp.json()["id"]

    # Distributor inventory must now be 300
    d_inv_after = client.get(f"/api/v1/inventory?batch_id={batch_id}", headers=dist_headers)
    assert d_inv_after.json()[0]["quantity_available"] == 300

    # STEP 5: Pharmacy receives 500 units
    pharm_recv = client.post(
        f"/api/v1/inventory/transfers/{dist_tf_id}/receive",
        headers=pharm_headers,
        json={"verified_quantity": 500}
    )
    assert pharm_recv.status_code == 200

    # Pharmacy inventory must now be 500
    p_inv = client.get(f"/api/v1/inventory?batch_id={batch_id}", headers=pharm_headers)
    assert p_inv.json()[0]["quantity_available"] == 500

    # STEP 6: Check Digital Batch Passport continuity & events
    events_res = client.get(f"/api/v1/batches/{batch_id}/events", headers=pharm_headers)
    assert events_res.status_code == 200
    events = events_res.json()
    stages = [e["event_type"] for e in events]

    assert "MANUFACTURED" in stages
    assert "MANUFACTURE_TO_DISTRIBUTOR" in stages
    assert "DISTRIBUTOR_RECEIVED" in stages
    assert "DISTRIBUTOR_TO_PHARMACY" in stages
    assert "PHARMACY_RECEIVED" in stages


def test_distributor_insufficient_stock_blocked(client, distributor_token):
    dist_headers = {"Authorization": f"Bearer {distributor_token}"}
    # Attempt to transfer 999999 units of B1001 -> 400 Insufficient stock
    res = client.post(
        "/api/v1/inventory/transfers/dispatch",
        headers=dist_headers,
        json={
            "batch_id": "btc_b1001_paracet",
            "to_organization_id": "org_medplus_retail",
            "quantity": 999999
        }
    )
    assert res.status_code == 400
    assert "Insufficient stock" in res.json()["detail"]


def test_pharmacy_verification_scan(client, pharmacy_token):
    pharm_headers = {"Authorization": f"Bearer {pharmacy_token}"}
    res = client.post(
        "/api/v1/verify/scan",
        headers=pharm_headers,
        json={"scanned_code": "8901088001001"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["batch_number"] == "B1001"
    assert data["verification_status"] == "AUTHENTIC"
    assert "Paracetamol" in data["generic_name"] or "Paracetamol" in data["brand_name"]
