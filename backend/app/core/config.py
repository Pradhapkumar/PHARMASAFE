import os
from typing import List, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    PROJECT_NAME: str = "PharmaSafe Intelligence"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # Security
    SECRET_KEY: str = "pharmasafe_super_secret_jwt_key_hackathon_demo_change_in_prod"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # Database: Default to SQLite for rapid local dev; set to PostgreSQL in .env for production
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./pharmasafe.db")

    # CORS — explicit origins only; no wildcard when credentials are used
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",
        "http://localhost:8080",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
    ]

    # File Storage Paths
    STORAGE_DIR: str = "./storage"
    PHOTO_UPLOAD_DIR: str = "./storage/photos"
    CERTIFICATE_DIR: str = "./storage/certificates"
    EVIDENCE_DIR: str = "./storage/evidence"

    # Business Rule Thresholds
    QUANTITY_DISCREPANCY_TOLERANCE: int = 3   # Units allowed before raising alert
    AI_EXPIRY_RISK_THRESHOLD: float = 0.75
    AI_ANOMALY_SENSITIVITY: float = 0.80
    AI_REENTRY_CRITICAL_THRESHOLD: float = 0.85

    class Config:
        case_sensitive = True
        env_file = ".env"
        extra = "allow"


settings = Settings()

# Ensure local storage directories exist
os.makedirs(settings.PHOTO_UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.CERTIFICATE_DIR, exist_ok=True)
os.makedirs(settings.EVIDENCE_DIR, exist_ok=True)
