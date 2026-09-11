"""Tests for Dashboard, Alerts, and Audit endpoints."""


# ---- DASHBOARD ----

def test_dashboard_summary(client):
    """Dashboard summary should return real KPI data."""
    response = client.get("/api/v1/dashboard/summary")
    assert response.status_code == 200
    data = response.json()
    required_fields = [
        "active_batches", "near_expiry_batches", "expired_batches",
        "recalled_batches", "dead_batches_in_registry",
        "reentry_violations_prevented", "compliance_rate"
    ]
    for field in required_fields:
        assert field in data, f"Missing field: {field}"
    # Seeded data: at least 1 dead batch, 1 recalled, 1 expired
    assert data["dead_batches_in_registry"] >= 1
    assert data["recalled_batches"] >= 1
    assert data["expired_batches"] >= 1
    assert 0 < data["compliance_rate"] <= 100.0


def test_dashboard_expiry_trend(client):
    response = client.get("/api/v1/dashboard/expiry-trend")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 6  # Last 6 months
    for point in data:
        assert "month" in point
        assert "count" in point


def test_dashboard_return_trend(client):
    response = client.get("/api/v1/dashboard/return-trend")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 6


def test_dashboard_risk_summary(client):
    response = client.get("/api/v1/dashboard/risk-summary")
    assert response.status_code == 200
    data = response.json()
    assert "reentry_incidents" in data
    assert "active_recalls" in data
    assert "risk_note" in data
    assert data["reentry_incidents"] >= 1  # Seeded re-entry scan


# ---- ALERTS ----

def test_list_alerts_unauthenticated(client):
    """Alerts require authentication."""
    response = client.get("/api/v1/alerts")
    assert response.status_code == 401


def test_list_all_alerts(client, admin_token):
    response = client.get(
        "/api/v1/alerts",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    # Seeded: 4 alerts
    assert len(data) >= 4


def test_list_critical_alerts(client, admin_token):
    response = client.get(
        "/api/v1/alerts?severity=CRITICAL",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    for alert in data:
        assert alert["severity"] == "CRITICAL"


def test_unread_alert_count(client, admin_token):
    response = client.get(
        "/api/v1/alerts/count/unread",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "unread_total" in data
    assert "unread_critical" in data
    assert data["unread_total"] >= 4
    assert data["unread_critical"] >= 2


def test_mark_alert_read(client, admin_token):
    # Get first unread alert
    alerts = client.get(
        "/api/v1/alerts?is_read=false",
        headers={"Authorization": f"Bearer {admin_token}"}
    ).json()
    assert len(alerts) > 0
    alert_id = alerts[0]["id"]

    response = client.patch(
        f"/api/v1/alerts/{alert_id}/read",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["is_read"] is True


def test_resolve_alert(client, admin_token):
    alerts = client.get(
        "/api/v1/alerts?is_read=false",
        headers={"Authorization": f"Bearer {admin_token}"}
    ).json()
    if not alerts:
        return  # May have been marked read in previous test
    alert_id = alerts[0]["id"]

    response = client.patch(
        f"/api/v1/alerts/{alert_id}/resolve",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["is_resolved"] is True
    assert data["is_read"] is True


# ---- AUDIT LOGS ----

def test_audit_log_created_on_batch_creation(client, manufacturer_token):
    """Creating a batch should create an audit log entry."""
    from datetime import date, timedelta
    today = date.today()

    client.post(
        "/api/v1/batches",
        json={
            "batch_number": "AUDIT-TEST-001",
            "gtin_barcode": "8901999099001",
            "medicine_id": "med_amox_500",
            "mfg_date": today.isoformat(),
            "expiry_date": (today + timedelta(days=365)).isoformat(),
            "initial_quantity": 1000,
            "unit": "BOX"
        },
        headers={"Authorization": f"Bearer {manufacturer_token}"}
    )

    # Fetch audit logs and verify the event was recorded
    response = client.get(
        "/api/v1/audit/logs",
        headers={"Authorization": f"Bearer {manufacturer_token}"}
    )
    assert response.status_code == 200
    logs = response.json()
    batch_created_logs = [l for l in logs if l["action"] == "BATCH_CREATED"]
    assert len(batch_created_logs) >= 1


def test_audit_log_created_on_recall(client, manufacturer_token):
    """Recalling a batch should create an audit log entry."""
    response = client.post(
        "/api/v1/batches/btc_amx_active_01/recall",
        json={"recall_reason": "Audit test recall"},
        headers={"Authorization": f"Bearer {manufacturer_token}"}
    )
    assert response.status_code == 200

    response = client.get(
        "/api/v1/audit/logs",
        headers={"Authorization": f"Bearer {manufacturer_token}"}
    )
    logs = response.json()
    recall_logs = [l for l in logs if l["action"] == "BATCH_RECALLED"]
    assert len(recall_logs) >= 1


# ---- ORGANIZATIONS ----

def test_list_organizations(client, admin_token):
    response = client.get(
        "/api/v1/organizations",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 6


def test_get_organization_by_id(client, admin_token):
    response = client.get(
        "/api/v1/organizations/org_pfizer_india",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "org_pfizer_india"
    assert data["name"] == "Pfizer Healthcare India Ltd."


def test_create_organization_admin_only(client, admin_token, pharmacy_token):
    # Admin can create
    response = client.post(
        "/api/v1/organizations",
        json={
            "name": "Test Pharma Ltd.",
            "role_type": "MANUFACTURER",
            "license_number": "LIC-TEST-NEW-99999",
            "address": "123 Test St",
            "city": "Mumbai",
            "country": "India"
        },
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 201

    # Pharmacy cannot create
    response = client.post(
        "/api/v1/organizations",
        json={
            "name": "Unauthorized Org",
            "role_type": "MANUFACTURER",
            "license_number": "LIC-UNAUTH-00001",
        },
        headers={"Authorization": f"Bearer {pharmacy_token}"}
    )
    assert response.status_code == 403


# ---- MEDICINES ----

def test_list_medicines(client):
    response = client.get("/api/v1/medicines")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 5  # Seeded: amox, paracet_500, paracet_650, azith, remdes
    medicine_names = [m["brand_name"] for m in data]
    assert "Paracetamol 500mg IP" in medicine_names  # B1001 medicine seeded


def test_get_medicine_b1001(client):
    response = client.get("/api/v1/medicines/med_paracet_500")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "med_paracet_500"
    assert data["generic_name"] == "Paracetamol"
    assert data["strength"] == "500mg"
