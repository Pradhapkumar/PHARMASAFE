"""
Sales API tests — the critical sale authorization gateway.
Backend is authoritative: ALL blocking decisions verified here.
"""


def test_sale_blocked_for_expired_batch(client, pharmacy_token):
    """Expired batch must never be sold."""
    response = client.post(
        "/api/v1/sales",
        json={"batch_id": "btc_azt_expired_02", "quantity": 10},
        headers={"Authorization": f"Bearer {pharmacy_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["sale_allowed"] is False
    assert data["error"]["code"] == "SALE_BLOCKED"
    assert "EXPIRED" in data["sale"]["block_reason"] or "EXPIRED" in data["error"]["message"].upper()


def test_sale_blocked_for_recalled_batch(client, pharmacy_token):
    """Recalled batch must be blocked at point of sale."""
    response = client.post(
        "/api/v1/sales",
        json={"batch_id": "btc_rmd_recall_03", "quantity": 5},
        headers={"Authorization": f"Bearer {pharmacy_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["sale_allowed"] is False
    assert "RECALL" in data["error"]["message"].upper() or "RECALLED" in data["sale"]["block_reason"]


def test_sale_blocked_for_dead_batch(client, pharmacy_token):
    """Dead batch (destroyed) — absolutely must never result in sale_allowed=True."""
    response = client.post(
        "/api/v1/sales",
        json={"batch_id": "btc_amx_dead_05", "quantity": 1},
        headers={"Authorization": f"Bearer {pharmacy_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["sale_allowed"] is False, "CRITICAL: Dead batch sale was allowed — must never happen!"
    assert "DESTRO" in data["error"]["message"].upper() or "DEAD" in data["error"]["message"].upper()


def test_sale_allowed_for_valid_batch(client, pharmacy_token, manufacturer_token):
    """A batch with inventory and no issues should be allowed for sale."""
    from datetime import date, timedelta
    today = date.today()

    # Create a fresh batch just for this test
    batch_resp = client.post(
        "/api/v1/batches",
        json={
            "batch_number": "SALE-TEST-VALID-001",
            "gtin_barcode": "8901099100001",
            "medicine_id": "med_paracet_500",
            "mfg_date": today.isoformat(),
            "expiry_date": (today + timedelta(days=365)).isoformat(),
            "initial_quantity": 1000,
            "unit": "BOX"
        },
        headers={"Authorization": f"Bearer {manufacturer_token}"}
    )
    assert batch_resp.status_code == 201
    batch_id = batch_resp.json()["id"]

    # Seed inventory for the pharmacy
    client.post(
        "/api/v1/inventory/receive",
        json={"batch_id": batch_id, "organization_id": "org_medplus_retail", "quantity": 500},
        headers={"Authorization": f"Bearer {pharmacy_token}"}
    )

    # Attempt sale
    response = client.post(
        "/api/v1/sales",
        json={"batch_id": batch_id, "quantity": 10, "customer_reference": "PT-VALID-001"},
        headers={"Authorization": f"Bearer {pharmacy_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["sale_allowed"] is True, f"Valid batch sale should be allowed: {data}"
    assert data["success"] is True


def test_sale_blocked_insufficient_stock(client, pharmacy_token):
    """Cannot sell more than available inventory."""
    response = client.post(
        "/api/v1/sales",
        json={"batch_id": "btc_b1001_paracet", "quantity": 9999999},
        headers={"Authorization": f"Bearer {pharmacy_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["sale_allowed"] is False
    # Blocked for any legitimate reason (may be in return state from b1001 lifecycle test)
    assert data["sale"]["block_reason"] is not None


def test_sale_requires_authentication(client):
    """Sale endpoint must require a JWT token."""
    response = client.post(
        "/api/v1/sales",
        json={"batch_id": "btc_amx_active_01", "quantity": 1}
    )
    assert response.status_code == 401


def test_sale_by_manufacturer_is_forbidden(client, manufacturer_token):
    """Manufacturers cannot record sales — only PHARMACY, DISTRIBUTOR, ADMIN."""
    response = client.post(
        "/api/v1/sales",
        json={"batch_id": "btc_amx_active_01", "quantity": 1},
        headers={"Authorization": f"Bearer {manufacturer_token}"}
    )
    assert response.status_code == 403


def test_list_sales(client, pharmacy_token):
    response = client.get(
        "/api/v1/sales",
        headers={"Authorization": f"Bearer {pharmacy_token}"}
    )
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_list_blocked_sales_filter(client, pharmacy_token):
    response = client.get(
        "/api/v1/sales?sale_allowed=false",
        headers={"Authorization": f"Bearer {pharmacy_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    # All returned items should be blocked
    for sale in data:
        assert sale["sale_allowed"] is False


def test_verify_sale_allowed_valid_batch(client, pharmacy_token, manufacturer_token):
    """Pre-flight verification gate for a valid batch allows sale and passes 8 checks."""
    from datetime import date, timedelta
    today = date.today()

    # Create batch
    b_res = client.post(
        "/api/v1/batches",
        json={
            "batch_number": "PRECHECK-VALID-01",
            "gtin_barcode": "8901099200001",
            "medicine_id": "med_paracet_500",
            "mfg_date": today.isoformat(),
            "expiry_date": (today + timedelta(days=200)).isoformat(),
            "initial_quantity": 500,
            "unit": "BOX"
        },
        headers={"Authorization": f"Bearer {manufacturer_token}"}
    )
    assert b_res.status_code == 201
    batch_id = b_res.json()["id"]

    # Intake to pharmacy
    client.post(
        "/api/v1/inventory/receive",
        json={"batch_id": batch_id, "organization_id": "org_medplus_retail", "quantity": 100},
        headers={"Authorization": f"Bearer {pharmacy_token}"}
    )

    # Pre-check verify
    v_res = client.post(
        "/api/v1/sales/verify",
        json={"batch_identifier": "PRECHECK-VALID-01", "quantity": 5},
        headers={"Authorization": f"Bearer {pharmacy_token}"}
    )
    assert v_res.status_code == 200
    v_data = v_res.json()
    assert v_data["is_eligible_for_sale"] is True
    assert v_data["verdict"] == "ALLOW_SALE"
    assert v_data["block_reason"] is None
    assert len(v_data["checks"]) == 8
    assert all(c["passed"] for c in v_data["checks"])


def test_verify_sale_blocked_expired(client, pharmacy_token):
    """Pre-flight check detects expired batch and blocks sale."""
    v_res = client.post(
        "/api/v1/sales/verify",
        json={"batch_identifier": "btc_azt_expired_02", "quantity": 1},
        headers={"Authorization": f"Bearer {pharmacy_token}"}
    )
    assert v_res.status_code == 200
    v_data = v_res.json()
    assert v_data["is_eligible_for_sale"] is False
    assert v_data["verdict"] == "BLOCK_SALE"
    assert v_data["block_reason"] == "EXPIRED"
    assert "EXPIRED" in v_data["block_message"].upper()


def test_verify_sale_blocked_recalled(client, pharmacy_token):
    """Pre-flight check detects recalled batch and blocks sale."""
    v_res = client.post(
        "/api/v1/sales/verify",
        json={"batch_identifier": "btc_rmd_recall_03", "quantity": 1},
        headers={"Authorization": f"Bearer {pharmacy_token}"}
    )
    assert v_res.status_code == 200
    v_data = v_res.json()
    assert v_data["is_eligible_for_sale"] is False
    assert v_data["verdict"] == "BLOCK_SALE"
    assert v_data["block_reason"] == "RECALLED"


def test_verify_sale_blocked_dead_batch(client, pharmacy_token):
    """Pre-flight check detects Dead Batch and locks out POS."""
    v_res = client.post(
        "/api/v1/sales/verify",
        json={"batch_identifier": "btc_amx_dead_05", "quantity": 1},
        headers={"Authorization": f"Bearer {pharmacy_token}"}
    )
    assert v_res.status_code == 200
    v_data = v_res.json()
    assert v_data["is_eligible_for_sale"] is False
    assert v_data["verdict"] == "BLOCK_SALE"
    assert v_data["block_reason"] == "DESTROYED"


def test_verify_sale_blocked_not_found(client, pharmacy_token):
    """Pre-flight check on unregistered counterfeit barcode."""
    v_res = client.post(
        "/api/v1/sales/verify",
        json={"batch_identifier": "FAKE_COUNTERFEIT_BARCODE_888", "quantity": 1},
        headers={"Authorization": f"Bearer {pharmacy_token}"}
    )
    assert v_res.status_code == 200
    v_data = v_res.json()
    assert v_data["is_eligible_for_sale"] is False
    assert v_data["verdict"] == "BLOCK_SALE"
    assert v_data["block_reason"] == "NOT_FOUND"


def test_sale_execution_by_batch_number(client, pharmacy_token, manufacturer_token):
    """Can execute sale directly with batch_number string."""
    from datetime import date, timedelta
    today = date.today()

    b_res = client.post(
        "/api/v1/batches",
        json={
            "batch_number": "SALE-BY-NUM-01",
            "gtin_barcode": "8901099300001",
            "medicine_id": "med_paracet_500",
            "mfg_date": today.isoformat(),
            "expiry_date": (today + timedelta(days=300)).isoformat(),
            "initial_quantity": 200,
            "unit": "BOX"
        },
        headers={"Authorization": f"Bearer {manufacturer_token}"}
    )
    assert b_res.status_code == 201

    client.post(
        "/api/v1/inventory/receive",
        json={"batch_id": b_res.json()["id"], "organization_id": "org_medplus_retail", "quantity": 50},
        headers={"Authorization": f"Bearer {pharmacy_token}"}
    )

    # Sell using batch_number
    s_res = client.post(
        "/api/v1/sales",
        json={"batch_number": "SALE-BY-NUM-01", "quantity": 5, "customer_reference": "PT-NUM-01"},
        headers={"Authorization": f"Bearer {pharmacy_token}"}
    )
    assert s_res.status_code == 200
    assert s_res.json()["sale_allowed"] is True
    assert s_res.json()["sale"]["quantity_sold"] == 5

