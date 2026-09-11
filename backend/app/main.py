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


@app.get("/", tags=["System"])
def root(request: Request):
    accept = request.headers.get("accept", "")
    if "text/html" in accept:
        from fastapi.responses import HTMLResponse
        return HTMLResponse(content="""
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <title>PharmaSafe Intelligence API</title>
          <style>
            body { background: #0b0f19; color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
            .card { background: #131b2e; border: 1px solid #1e293b; border-radius: 16px; padding: 40px; max-width: 540px; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
            h1 { color: #10b981; font-size: 24px; margin-bottom: 8px; }
            p { color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 12px 0; }
            .badge { display: inline-block; background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.3); color: #10b981; padding: 4px 12px; border-radius: 99px; font-size: 12px; font-weight: bold; margin-bottom: 16px; }
            .btn { display: inline-block; background: #10b981; color: #022c22; font-weight: bold; padding: 10px 24px; border-radius: 8px; text-decoration: none; margin: 8px; font-size: 14px; transition: all 0.2s; }
            .btn:hover { background: #34d399; }
            .btn-secondary { background: #1e293b; color: #38bdf8; border: 1px solid #334155; }
            .btn-secondary:hover { background: #334155; }
            code { background: #0f172a; color: #38bdf8; padding: 2px 6px; border-radius: 4px; font-family: monospace; }
          </style>
        </head>
        <body>
          <div class="card">
            <span class="badge">● PRODUCTION API ACTIVE</span>
            <h1>PharmaSafe Intelligence Core API</h1>
            <p>You have connected to the <strong>authoritative backend engine</strong>. This cloud node handles real-time pharmaceutical safety verification, Dead Batch cryptography, and AI surveillance.</p>
            <p>To view the <strong>Visual Web Dashboard</strong>, please open your Frontend Web App deployment link (e.g. <code>pharmasafe-web.onrender.com</code>).</p>
            <div style="margin-top: 24px;">
              <a href="/docs" class="btn">Explore API Swagger Docs (/docs)</a>
              <a href="/api/health" class="btn btn-secondary">Check System Health</a>
            </div>
          </div>
        </body>
        </html>
        """)
    return {
        "message": "Welcome to PharmaSafe Intelligence Core API",
        "service": "PharmaSafe Closed-Loop Medicine Safety Platform",
        "docs": "/docs",
        "health": "/api/health",
        "api_v1": settings.API_V1_STR,
    }


# Catch-all fallback for frontend routes navigated directly on the backend domain
@app.get("/{full_path:path}", tags=["System"], include_in_schema=False)
def frontend_route_fallback(full_path: str, request: Request):
    if full_path.startswith("api/") or full_path.startswith("docs") or full_path.startswith("redoc") or full_path.startswith("openapi.json"):
        return JSONResponse(status_code=404, content={"detail": "API endpoint not found"})
    
    accept = request.headers.get("accept", "")
    if "text/html" in accept:
        from fastapi.responses import HTMLResponse
        return HTMLResponse(content=f"""
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <title>PharmaSafe API Guidance</title>
          <style>
            body {{ background: #0b0f19; color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }}
            .card {{ background: #131b2e; border: 1px solid #1e293b; border-radius: 16px; padding: 40px; max-width: 540px; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }}
            h1 {{ color: #38bdf8; font-size: 22px; margin-bottom: 8px; }}
            p {{ color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 12px 0; }}
            code {{ background: #0f172a; color: #10b981; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 13px; }}
            .btn {{ display: inline-block; background: #10b981; color: #022c22; font-weight: bold; padding: 10px 24px; border-radius: 8px; text-decoration: none; margin: 8px; font-size: 14px; }}
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Web Dashboard Route Detected</h1>
            <p>You requested <code>/{full_path}</code> on the <strong>Backend API server</strong>.</p>
            <p>The visual User Interface runs on your <strong>Frontend Web Service</strong> (e.g. <code>https://pharmasafe-web.onrender.com/{full_path}</code>).</p>
            <div style="margin-top: 20px;">
              <a href="/docs" class="btn">View Backend API Documentation</a>
            </div>
          </div>
        </body>
        </html>
        """)
    return JSONResponse(status_code=404, content={"detail": f"Route '/{full_path}' is a frontend UI route. Please access via the frontend web application."})

