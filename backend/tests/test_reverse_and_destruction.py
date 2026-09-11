from datetime import date, timedelta
import pytest
from backend.app.models.destruction import DestructionRecord
from backend.app.models.dead_batch import DeadBatch

def test_initiate_return_request_as_pharmacy(client, pharmacy_token):
    # Initiate return on expired batch AZT-2025-EXP
    payload = {
        "batch_id": "btc_azt_expired_02",
        "destination_facility_id": "org_green_shield_disposal",
        "quantity": 400,
        "reason": "EXPIRED",
        "notes": "Returning expired Azithral packs from pharmacy shelf",
        "carrier_name": "SecureMed Transit Ltd",
        "carrier_tracking_ref": "TRK-CARRIER-994",
        "driver_badge": "DRV-551"
    }
    response = client.post(
        "/api/v1/returns",
        json=payload,
        headers={"Authorization": f"Bearer {pharmacy_token}"}
    )
    assert response.status_code == 201
    data = response.json()
    assert data["batch_id"] == "btc_azt_expired_02"
    assert data["status"] == "INITIATED"
    assert "TRK-REV-" in data["tracking_code"]
    assert len(data["manifest_hash"]) == 64
    assert data["carrier_name"] == "SecureMed Transit Ltd"


def test_full_reverse_chain_pharmacy_to_disposal(client, pharmacy_token, disposal_token):
    # 1. Initiate return
    init_payload = {
        "batch_id": "btc_azt_expired_02",
        "destination_facility_id": "org_green_shield_disposal",
        "quantity": 100,
        "reason": "EXPIRED",
        "notes": "Reverse custody chain test"
    }
    init_resp = client.post(
        "/api/v1/returns",
        json=init_payload,
        headers={"Authorization": f"Bearer {pharmacy_token}"}
    )
    assert init_resp.status_code == 201
    return_id = init_resp.json()["id"]

    # 2. Transition to IN_TRANSIT with pickup info
    transit_resp = client.patch(
        f"/api/v1/returns/{return_id}/status",
        json={
            "status": "IN_TRANSIT",
            "carrier_name": "Apex Reverse Express",
            "driver_badge": "DRV-9092",
            "notes": "Stock collected from pharmacy backroom"
        },
        headers={"Authorization": f"Bearer {disposal_token}"}
    )
    assert transit_resp.status_code == 200
    assert transit_resp.json()["status"] == "IN_TRANSIT"

    # 3. Transition to RECEIVED_AT_DISPOSAL with tare weight and exact received quantity
    intake_resp = client.patch(
        f"/api/v1/returns/{return_id}/status",
        json={
            "status": "RECEIVED_AT_DISPOSAL",
            "received_quantity": 100,
            "scale_weight_kg": "45.8",
            "notes": "Weigh-in complete. Stock verified in quarantine bay."
        },
        headers={"Authorization": f"Bearer {disposal_token}"}
    )
    assert intake_resp.status_code == 200
    assert intake_resp.json()["status"] == "RECEIVED_AT_DISPOSAL"
    assert intake_resp.json()["scale_weight_kg"] == "45.8"


def test_reverse_return_quantity_discrepancy_alert(client, pharmacy_token, disposal_token, admin_token):
    # 1. Initiate return for 400 units
    init_resp = client.post(
        "/api/v1/returns",
        json={
            "batch_id": "btc_azt_expired_02",
            "destination_facility_id": "org_green_shield_disposal",
            "quantity": 400,
            "reason": "STORAGE_BREACH",
            "notes": "Temperature breach during transport"
        },
        headers={"Authorization": f"Bearer {pharmacy_token}"}
    )
    assert init_resp.status_code == 201
    return_id = init_resp.json()["id"]

    # 2. Disposal facility receives only 350 units (discrepancy 50 > tolerance 10)
    intake_resp = client.patch(
        f"/api/v1/returns/{return_id}/status",
        json={
            "status": "RECEIVED_AT_DISPOSAL",
            "received_quantity": 350,
            "scale_weight_kg": "120.0",
            "notes": "50 units missing upon pallet opening!"
        },
        headers={"Authorization": f"Bearer {disposal_token}"}
    )
    assert intake_resp.status_code == 200

    # 3. Verify Alert generated titled DISCREPANCY DETECTED
    alerts_resp = client.get("/api/v1/alerts", headers={"Authorization": f"Bearer {admin_token}"})
    assert alerts_resp.status_code == 200
    alerts = alerts_resp.json()
    assert any(a["alert_type"] == "QUANTITY_DISCREPANCY" for a in alerts)


def test_distributor_routes_return_to_disposal(client, pharmacy_token, distributor_token):
    # 1. Pharmacy returns to distributor depot
    init_resp = client.post(
        "/api/v1/returns",
        json={
            "batch_id": "btc_azt_expired_02",
            "destination_facility_id": "org_distributor_apex",
            "quantity": 50,
            "reason": "CUSTOMER_RETURN",
            "notes": "Returned by retail customer"
        },
        headers={"Authorization": f"Bearer {pharmacy_token}"}
    )
    assert init_resp.status_code == 201
    return_id = init_resp.json()["id"]

    # 2. Distributor routes return consignment to disposal facility
    route_resp = client.post(
        f"/api/v1/returns/{return_id}/route-to-disposal",
        json={
            "disposal_facility_id": "org_green_shield_disposal",
            "carrier_name": "BioHazard Logistics",
            "driver_badge": "BADGE-BIO-77",
            "notes": "Consigned to GreenShield thermal destruction plant"
        },
        headers={"Authorization": f"Bearer {distributor_token}"}
    )
    assert route_resp.status_code == 200
    assert route_resp.json()["status"] == "ROUTED_TO_DISPOSAL"
    assert route_resp.json()["destination_facility_id"] == "org_green_shield_disposal"


def test_operational_disposal_intake_and_completion(client, pharmacy_token, disposal_token):
    # 1. Initiate return request
    init_resp = client.post(
        "/api/v1/returns",
        json={
            "batch_id": "btc_azt_expired_02",
            "destination_facility_id": "org_green_shield_disposal",
            "quantity": 100,
            "reason": "EXPIRED",
            "notes": "Phase 7 disposal boundary test"
        },
        headers={"Authorization": f"Bearer {pharmacy_token}"}
    )
    assert init_resp.status_code == 201
    return_id = init_resp.json()["id"]

    # 2. Operational disposal intake
    intake_resp = client.post(
        "/api/v1/disposal/intake",
        json={
            "return_id": return_id,
            "batch_id": "btc_azt_expired_02",
            "disposed_quantity": 100,
            "disposal_method": "HIGH_TEMP_INCINERATION_1200C",
            "scale_weight_kg": "45.5",
            "notes": "Intake completed at disposal facility"
        },
        headers={"Authorization": f"Bearer {disposal_token}"}
    )
    assert intake_resp.status_code == 201
    disposal_id = intake_resp.json()["id"]
    assert intake_resp.json()["status"] == "DISPOSAL_IN_PROGRESS"

    # 3. Complete operational disposal
    complete_resp = client.post(
        f"/api/v1/disposal/{disposal_id}/complete",
        json={"notes": "Incineration processing complete. Status: DISPOSED."},
        headers={"Authorization": f"Bearer {disposal_token}"}
    )
    assert complete_resp.status_code == 200
    comp_data = complete_resp.json()
    assert comp_data["status"] == "DISPOSED"

    # 4. Verify return request status ends at DISPOSED (NOT COMPLETED_DESTROYED or DESTROYED)
    ret_resp = client.get(f"/api/v1/returns/{return_id}")
    assert ret_resp.status_code == 200
    assert ret_resp.json()["status"] == "DISPOSED"

    # 5. Verify batch status ends at DISPOSED (NOT DEAD_BATCH or DESTROYED)
    batch_resp = client.get("/api/v1/batches/btc_azt_expired_02")
    assert batch_resp.status_code == 200
    assert batch_resp.json()["status"] == "DISPOSED"


def test_operational_disposal_ends_at_disposed(client, pharmacy_token, disposal_token, db):
    # Phase 7 Boundary Test: Operational disposal ends at DISPOSED and does not trigger Phase 8 artifacts
    init_resp = client.post(
        "/api/v1/returns",
        json={
            "batch_id": "btc_azt_expired_02",
            "destination_facility_id": "org_green_shield_disposal",
            "quantity": 50,
            "reason": "EXPIRED",
            "notes": "Boundary verification test"
        },
        headers={"Authorization": f"Bearer {pharmacy_token}"}
    )
    return_id = init_resp.json()["id"]

    intake_resp = client.post(
        "/api/v1/disposal/intake",
        json={
            "return_id": return_id,
            "batch_id": "btc_azt_expired_02",
            "disposed_quantity": 50,
            "disposal_method": "HIGH_TEMP_INCINERATION_1200C"
        },
        headers={"Authorization": f"Bearer {disposal_token}"}
    )
    disposal_id = intake_resp.json()["id"]

    complete_resp = client.post(
        f"/api/v1/disposal/{disposal_id}/complete",
        headers={"Authorization": f"Bearer {disposal_token}"}
    )
    assert complete_resp.status_code == 200

    # Verify states
    ret = client.get(f"/api/v1/returns/{return_id}").json()
    batch = client.get("/api/v1/batches/btc_azt_expired_02").json()

    assert ret["status"] == "DISPOSED"
    assert batch["status"] == "DISPOSED"
    assert batch["status"] != "DESTROYED"
    assert batch["status"] != "DEAD_BATCH"


def test_phase7_rejects_completed_destroyed_status(client, pharmacy_token, disposal_token):
    # Phase 7 Boundary Test: Reject Phase 8 states in return status update endpoint
    # 
    # Phase 8-exclusive states (DEAD_BATCH, DESTROYED, COMPLETED_DESTROYED) must NEVER
    # be assignable through the Phase 7 return status endpoint.
    # 
    # Two valid rejection mechanisms:
    #   - 422 Unprocessable Entity: value not in ReturnStatusEnum schema (schema-level rejection)
    #   - 400 Bad Request: business logic blocks the transition
    # Both are acceptable — the key invariant is that these status values are NEVER accepted (200/201).

    init_resp = client.post(
        "/api/v1/returns",
        json={
            "batch_id": "btc_azt_expired_02",
            "destination_facility_id": "org_green_shield_disposal",
            "quantity": 20,
            "reason": "EXPIRED"
        },
        headers={"Authorization": f"Bearer {pharmacy_token}"}
    )
    return_id = init_resp.json()["id"]

    # All Phase 8 terminal states are FORBIDDEN in Phase 7's return status endpoint
    for invalid_status in ["DEAD_BATCH", "DESTROYED", "COMPLETED_DESTROYED"]:
        resp = client.patch(
            f"/api/v1/returns/{return_id}/status",
            json={"status": invalid_status},
            headers={"Authorization": f"Bearer {disposal_token}"}
        )
        # MUST be 400 (business rule) or 422 (schema validation) — never 200/201
        assert resp.status_code in [400, 422], (
            f"Phase 7 endpoint MUST reject '{invalid_status}' with 400 or 422. "
            f"Got {resp.status_code}. Phase 8 states must never be set via Phase 7 endpoints."
        )


def test_certify_destruction_as_disposal_facility(client, manufacturer_token, disposal_token, pharmacy_token):
    # Preserved Phase 8 Regression Test: Full lifecycle — Phase 7 disposal + Phase 8 certification
    today = date.today()
    # 1. Create batch
    batch_resp = client.post(
        "/api/v1/batches",
        json={
            "batch_number": "DEST-TEST-BATCH-99",
            "gtin_barcode": "8909999000111",
            "medicine_id": "med_amox_500",
            "mfg_date": (today - timedelta(days=400)).isoformat(),
            "expiry_date": (today - timedelta(days=10)).isoformat(),
            "initial_quantity": 500,
            "unit": "BOX"
        },
        headers={"Authorization": f"Bearer {manufacturer_token}"}
    )
    assert batch_resp.status_code == 201
    test_batch_id = batch_resp.json()["id"]

    # 2. Phase 7: Initiate return from pharmacy
    return_resp = client.post(
        "/api/v1/returns",
        json={
            "batch_id": test_batch_id,
            "destination_facility_id": "org_green_shield_disposal",
            "quantity": 500,
            "reason": "EXPIRED",
            "notes": "Phase 7 disposal for regression test"
        },
        headers={"Authorization": f"Bearer {pharmacy_token}"}
    )
    assert return_resp.status_code == 201
    return_id = return_resp.json()["id"]

    # 3. Phase 7: Disposal intake
    intake_resp = client.post(
        "/api/v1/disposal/intake",
        json={
            "batch_id": test_batch_id,
            "return_id": return_id,
            "disposed_quantity": 500,
            "disposal_method": "HIGH_TEMP_INCINERATION_1200C",
        },
        headers={"Authorization": f"Bearer {disposal_token}"}
    )
    assert intake_resp.status_code == 201
    disposal_id = intake_resp.json()["id"]

    # 4. Phase 7: Complete disposal -> DISPOSED
    complete_resp = client.post(
        f"/api/v1/disposal/{disposal_id}/complete",
        headers={"Authorization": f"Bearer {disposal_token}"}
    )
    assert complete_resp.status_code == 200
    assert complete_resp.json()["status"] == "DISPOSED"

    # 5. Phase 8: Certify destruction (from DISPOSED state)
    payload = {
        "batch_id": test_batch_id,
        "disposal_id": disposal_id,
        "quantity_destroyed": 500,
        "destruction_method": "HIGH_TEMP_INCINERATION_1200C",
        "witness_name": "Senior Inspector K. Nair",
        "witness_badge_id": "INSP-AP-8841",
        "facility_notes": "Denatured in chemical bath followed by high temp incineration."
    }
    response = client.post(
        "/api/v1/destruction/records",
        json=payload,
        headers={"Authorization": f"Bearer {disposal_token}"}
    )
    assert response.status_code == 201
    data = response.json()
    assert len(data["certificate_sha256_hash"]) == 64
    assert data["quantity_destroyed"] == 500
    assert data["certificate_id"].startswith("DC-")

    # 6. Verify Dead Batch Registry entry created
    list_dead = client.get("/api/v1/dead-batches")
    assert list_dead.status_code == 200
    dead_batches = list_dead.json()
    assert any(b["batch_number"] == "DEST-TEST-BATCH-99" for b in dead_batches)
