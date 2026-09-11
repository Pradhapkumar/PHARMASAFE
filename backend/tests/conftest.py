import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.app.core.config import settings
from backend.app.db.base import Base
from backend.app.db.session import get_db
from backend.app.main import app
from backend.app.seeds.seed_data import seed_database

# Use in-memory SQLite or test file db for testing
TEST_DATABASE_URL = "sqlite:///./test_pharmasafe.db"
test_engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    
    # Override get_db dependency
    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    
    # Run seed script into test database
    from backend.app.seeds import seed_data
    seed_data.engine = test_engine
    seed_data.SessionLocal = TestingSessionLocal
    seed_data.seed_database()

    yield

    # Teardown
    Base.metadata.drop_all(bind=test_engine)
    if os.path.exists("./test_pharmasafe.db"):
        try:
            os.remove("./test_pharmasafe.db")
        except Exception:
            pass

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture
def manufacturer_token(client):
    response = client.post("/api/v1/auth/login", json={
        "email": "manufacturer@pharmasafe.demo",
        "password": "password123"
    })
    assert response.status_code == 200
    return response.json()["access_token"]

@pytest.fixture
def pharmacy_token(client):
    response = client.post("/api/v1/auth/login", json={
        "email": "pharmacy@pharmasafe.demo",
        "password": "password123"
    })
    assert response.status_code == 200
    return response.json()["access_token"]

@pytest.fixture
def disposal_token(client):
    response = client.post("/api/v1/auth/login", json={
        "email": "disposal@pharmasafe.demo",
        "password": "password123"
    })
    assert response.status_code == 200
    return response.json()["access_token"]

@pytest.fixture
def regulator_token(client):
    response = client.post("/api/v1/auth/login", json={
        "email": "regulator@pharmasafe.demo",
        "password": "password123"
    })
    assert response.status_code == 200
    return response.json()["access_token"]

@pytest.fixture
def distributor_token(client):
    response = client.post("/api/v1/auth/login", json={
        "email": "distributor@pharmasafe.demo",
        "password": "password123"
    })
    assert response.status_code == 200
    return response.json()["access_token"]

@pytest.fixture
def admin_token(client):
    response = client.post("/api/v1/auth/login", json={
        "email": "admin@pharmasafe.demo",
        "password": "password123"
    })
    assert response.status_code == 200
    return response.json()["access_token"]

@pytest.fixture
def db():
    """Provide a direct database session for tests that need to manipulate DB state."""
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
