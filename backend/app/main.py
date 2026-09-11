import logging
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import SQLAlchemyError

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

# CORS — only explicit origins; no wildcard
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
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


@app.get("/", tags=["System"])
def root():
    return {
        "message": "Welcome to PharmaSafe Intelligence Core API",
        "docs": "/docs",
        "health": "/api/health",
        "api_v1": settings.API_V1_STR,
    }
