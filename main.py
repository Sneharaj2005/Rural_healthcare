"""
Rural Health Companion AI Lite — FastAPI application entry point.

Start with:
    uvicorn main:app --reload --port 8000
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import ORJSONResponse
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.middleware.cors import CORSMiddleware
from app.config.settings import settings
from app.database.connection import connect_db, close_db
from app.middleware.cors import register_cors
from app.middleware.error_handler import register_error_handlers
from app.middleware.logging_middleware import RequestLoggingMiddleware
from app.api.v1.router import api_v1_router
from app.services.scheduler import start_scheduler, stop_scheduler
from app.utils.logger import get_logger

logger = get_logger("rhc.main")


# ── Lifespan (startup / shutdown) ─────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(
        f"Starting {settings.APP_NAME} v{settings.APP_VERSION}",
        extra={"env": settings.APP_ENV},
    )
    await connect_db()
    
    # Seed default guidance data if empty
    from app.database.connection import get_db
    from app.services.guidance_service import GuidanceService
    await GuidanceService(get_db()).seed_default_guidance()
    
    start_scheduler()          # ← start daily reminder job
    yield
    stop_scheduler()           # ← graceful shutdown
    await close_db()
    logger.info("Application shutdown complete.")


# ── App factory ───────────────────────────────────────────────────────────────
app = FastAPI(
    title=settings.APP_NAME,
    description=(
        "Backend API for the Rural Health Companion AI Lite application. "
        "Provides authentication, health records management, clinic discovery, "
        "and AI-powered health guidance."
    ),
    version=settings.APP_VERSION,
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    # Hide docs in production
    openapi_tags=[
        {"name": "Authentication",  "description": "Register and login"},
        {"name": "Users",           "description": "User profile management"},
        {"name": "Health Records",  "description": "Personal health record CRUD"},
        {"name": "AI Chat",         "description": "Gemini-powered health assistant"},
        {"name": "System",          "description": "Health checks and system info"},
    ],
    default_response_class=ORJSONResponse,
)

# ── Middleware (order matters — outermost registered last) ────────────────────
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    # Let CORS middleware handle OPTIONS preflight requests unmodified
    if request.method == "OPTIONS":
        return await call_next(request)
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response

register_cors(app)                          # 1. CORS headers
app.add_middleware(GZipMiddleware, minimum_size=1000)  # 2. Gzip compression
app.add_middleware(RequestLoggingMiddleware)            # 3. Request/response logging

# ── Exception handlers ────────────────────────────────────────────────────────
register_error_handlers(app)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(api_v1_router, prefix="/api/v1")

# Keep /api prefix as alias so existing frontend calls still work
app.include_router(api_v1_router, prefix="/api", include_in_schema=False)


# ── System endpoints ──────────────────────────────────────────────────────────
@app.get("/", tags=["System"], summary="Root")
async def root():
    return {
        "app":     settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs":    "/api/docs",
        "health":  "/api/health",
    }


@app.get("/api/health", tags=["System"], summary="Health check")
async def health_check():
    from app.database.connection import _client  # noqa: PLC0415
    db_status = "connected"
    try:
        if _client:
            await _client.admin.command("ping")
    except Exception:
        db_status = "unreachable"

    return {
        "status":      "healthy" if db_status == "connected" else "degraded",
        "version":     settings.APP_VERSION,
        "environment": settings.APP_ENV,
        "database":    db_status,
    }
