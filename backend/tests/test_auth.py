def test_login_success(client):
    response = client.post("/api/v1/auth/login", json={
        "email": "manufacturer@pharmasafe.demo",
        "password": "password123"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["role"] == "MANUFACTURER"

def test_login_invalid_credentials(client):
    response = client.post("/api/v1/auth/login", json={
        "email": "manufacturer@pharmasafe.demo",
        "password": "wrong_password"
    })
    assert response.status_code == 401
    assert "Incorrect email or password" in response.json()["detail"]

def test_get_current_user_me(client, manufacturer_token):
    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {manufacturer_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "manufacturer@pharmasafe.demo"
    assert data["role"] == "MANUFACTURER"

def test_rbac_unauthorized_access(client):
    # Without token
    response = client.post("/api/v1/batches", json={})
    assert response.status_code == 401
