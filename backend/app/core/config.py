import os
from typing import List
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

    # Database — SQLite locally, PostgreSQL on Render via DATABASE_URL env var
    DATABASE_URL: str = "sqlite:///./pharmasafe.db"

    # CORS — explicit list; FRONTEND_URL injected at runtime for Render deployment
    FRONTEND_URL: str = ""   # e.g. https://pharmasafe-web.onrender.com

    # File Storage Paths
    STORAGE_DIR: str = "./storage"
    PHOTO_UPLOAD_DIR: str = "./storage/photos"
    CERTIFICATE_DIR: str = "./storage/certificates"
    EVIDENCE_DIR: str = "./storage/evidence"

    # Business Rule Thresholds
    QUANTITY_DISCREPANCY_TOLERANCE: int = 3
    AI_EXPIRY_RISK_THRESHOLD: float = 0.75
    AI_ANOMALY_SENSITIVITY: float = 0.80
    AI_REENTRY_CRITICAL_THRESHOLD: float = 0.85

    @property
    def all_cors_origins(self) -> List[str]:
        """Merge static local origins with the deployed frontend URL."""
        base = [
            "http://localhost:5173",
            "http://localhost:5174",
            "http://localhost:3000",
            "http://localhost:8080",
            "http://127.0.0.1:5173",
            "http://127.0.0.1:5174",
        ]
        if self.FRONTEND_URL:
            base.append(self.FRONTEND_URL.rstrip("/"))
        return base

    # Keep backward-compat alias used in main.py
    @property
    def BACKEND_CORS_ORIGINS(self) -> List[str]:  # noqa: N802
        return self.all_cors_origins

    class Config:
        case_sensitive = True
        env_file = ".env"
        extra = "allow"


settings = Settings()

# Ensure local storage directories exist
os.makedirs(settings.PHOTO_UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.CERTIFICATE_DIR, exist_ok=True)
os.makedirs(settings.EVIDENCE_DIR, exist_ok=True)

