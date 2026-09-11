"""Tests for Inventory API — receive, transfer, stock constraints."""


def test_receive_inventory_success(client, manufacturer_token):
    response = client.post(
        "/api/v1/inventory/receive",
        json={
            "batch_id": "btc_b1001_paracet",
            "organization_id": "org_pfizer_india",
            "quantity": 500
        },
        headers={"Authorization": f"Bearer {manufacturer_token}"}
    )
    assert response.status_code == 201
    data = response.json()
    assert data["quantity_received"] >= 500
    assert data["quantity_available"] >= 500


def test_receive_inventory_invalid_quantity(client, manufacturer_token):
    response = client.post(
        "/api/v1/inventory/receive",
        json={
            "batch_id": "btc_b1001_paracet",
            "organization_id": "org_pfizer_india",
            "quantity": -10
        },
        headers={"Authorization": f"Bearer {manufacturer_token}"}
    )
    assert response.status_code == 422  # Validation error: gt=0


def test_list_inventory_for_org(client, pharmacy_token):
    response = client.get(
        "/api/v1/inventory?organization_id=org_medplus_retail",
        headers={"Authorization": f"Bearer {pharmacy_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1


def test_list_inventory_unauthenticated(client):
    response = client.get("/api/v1/inventory")
    assert response.status_code == 401


def test_transfer_inventory_success(client, manufacturer_token):
    # Ensure source org has stock first
    client.post(
        "/api/v1/inventory/receive",
        json={
            "batch_id": "btc_b1001_paracet",
            "organization_id": "org_pfizer_india",
            "quantity": 500
        },
        headers={"Authorization": f"Bearer {manufacturer_token}"}
    )
    response = client.post(
        "/api/v1/inventory/transfer",
        json={
            "batch_id": "btc_b1001_paracet",
            "from_org_id": "org_pfizer_india",
            "to_org_id": "org_apollo_logistics",
            "quantity": 100
        },
        headers={"Authorization": f"Bearer {manufacturer_token}"}
    )
    assert response.status_code == 201
    data = response.json()
    assert data["quantity_received"] >= 100


def test_transfer_insufficient_stock(client, manufacturer_token):
    response = client.post(
        "/api/v1/inventory/transfer",
        json={
            "batch_id": "btc_b1001_paracet",
            "from_org_id": "org_cdsco_regulator",  # This org has zero stock
            "to_org_id": "org_apollo_logistics",
            "quantity": 9999999
        },
        headers={"Authorization": f"Bearer {manufacturer_token}"}
    )
    assert response.status_code == 400
    assert "Insufficient" in response.json()["detail"]
