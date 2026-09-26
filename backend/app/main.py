import os
import sys

# Ensure both workspace root and backend directory are in sys.path
_current_file = os.path.abspath(__file__)
_app_dir = os.path.dirname(_current_file)
_backend_dir = os.path.dirname(_app_dir)
_root_dir = os.path.dirname(_backend_dir)
for _p in [_root_dir, _backend_dir, _app_dir]:
    if _p and _p not in sys.path:
        sys.path.insert(0, _p)

import logging
from pathlib import Path
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.exceptions import RequestValidationError
from fastapi.staticfiles import StaticFiles
from sqlalchemy.exc import SQLAlchemyError

# ── Locate frontend dist folder (works both locally and on Render) ──
# main.py is at: <root>/backend/app/main.py
# dist is at:    <root>/frontend/dist
_ROOT_DIR = Path(__file__).resolve().parent.parent.parent
FRONTEND_DIST = _ROOT_DIR / "frontend" / "dist"

from backend.app.core.config import settings
from backend.app.db.base import Base
from backend.app.db.session import engine, SessionLocal
from backend.app.api.v1.api import api_router

# Configure logging — do NOT log passwords or secrets
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger("pharmasafe")

# Create DB tables automatically on startup (for rapid local dev/testing)
# In production, use Alembic migrations instead
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="PharmaSafe Intelligence API",
    description=(
        "AI-Powered Pharmaceutical Reverse Chain & Medicine Safety Platform — "
        "Backend REST API. Phase 3: Full PostgreSQL backend with RBAC, closed-loop "
        "batch lifecycle, Dead Batch Registry, and destruction certificate verification."
    ),
    version="3.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
)

# CORS configuration supporting localhost, dynamic host, and Render deployment
app.add_middleware(
    CORSMiddleware,
    allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
    allow_origin_regex=r"https://.*\.onrender\.com|http://localhost.*|http://127\.0\.0\.1.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---- Centralized Exception Handlers ----

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Return consistent validation error format."""
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Request validation failed",
                "details": exc.errors(),
            },
        },
    )


@app.exception_handler(SQLAlchemyError)
async def database_exception_handler(request: Request, exc: SQLAlchemyError):
    """Handle database errors without leaking internal details."""
    logger.error(f"Database error on {request.method} {request.url.path}: {exc}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error": {
                "code": "DATABASE_ERROR",
                "message": "A database error occurred. Please try again.",
            },
        },
    )


# ---- Request Logging Middleware ----

@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info(f"→ {request.method} {request.url.path}")
    response = await call_next(request)
    logger.info(f"← {request.method} {request.url.path} | {response.status_code}")
    return response


# ---- Register API Routes ----

app.include_router(api_router, prefix=settings.API_V1_STR)


# ---- Health Check Endpoints ----

@app.get("/api/health", tags=["System"])
@app.get("/api/v1/health", tags=["System"])
def health_check():
    """Basic health check — returns ok if the service is running."""
    return {
        "status": "ok",
        "service": "PharmaSafe Intelligence API",
        "version": "3.0.0",
        "environment": settings.ENVIRONMENT,
    }


@app.get("/api/health/db", tags=["System"])
@app.get("/api/v1/health/db", tags=["System"])
def health_check_db():
    """Database connectivity check."""
    try:
        from sqlalchemy import text
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        return {"status": "ok", "database": "connected"}
    except Exception as e:
        logger.error(f"DB health check failed: {e}")
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"status": "error", "database": "disconnected", "detail": "DB unreachable"},
        )


@app.get("/health", tags=["System"])
def health_check_alias():
    """Legacy health alias."""
    return {"status": "healthy", "service": "PharmaSafe Intelligence API", "version": "3.0.0"}


# ── Serve React Frontend (SPA) ─────────────────────────────────────
# Mount static assets from the Vite build output.
# Falls back to index.html for any unknown path (React Router handles routing).

if FRONTEND_DIST.exists():
    # Mount compiled JS/CSS/image assets
    assets_dir = FRONTEND_DIST / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")
    logger.info(f"✅ Serving React frontend from: {FRONTEND_DIST}")
else:
    logger.warning(f"⚠️  Frontend dist not found at {FRONTEND_DIST} — run 'npm run build' in /frontend")


@app.get("/", include_in_schema=False)
def serve_index():
    """Serve React app root."""
    index = FRONTEND_DIST / "index.html"
    if index.exists():
        return FileResponse(str(index))
    return JSONResponse(
        status_code=200,
        content={"message": "PharmaSafe API", "docs": "/docs", "health": "/api/health"},
    )


@app.get("/{full_path:path}", include_in_schema=False)
def serve_spa(full_path: str):
    """SPA catch-all — serve index.html for any frontend route so React Router works."""
    # Let actual API/docs paths return 404 rather than the SPA
    api_prefixes = ("api/", "docs", "redoc", "openapi.json", "favicon")
    if any(full_path.startswith(p) for p in api_prefixes):
        return JSONResponse(status_code=404, content={"detail": f"/{full_path} not found"})

    # Try to serve a real file first (e.g. favicon.ico, robots.txt)
    static_file = FRONTEND_DIST / full_path
    if static_file.is_file():
        return FileResponse(str(static_file))

    # Fallback: always return index.html (React Router takes over)
    index = FRONTEND_DIST / "index.html"
    if index.exists():
        return FileResponse(str(index))

    return JSONResponse(status_code=404, content={"detail": "Frontend not built. Run npm run build."})
