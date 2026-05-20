"""
CORS middleware configuration helper.
"""
import re
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.config.settings import settings

# Regex patterns for allowed origin wildcards (Vercel preview URLs)
ALLOWED_ORIGIN_PATTERNS = [
    re.compile(r"https://.*\.vercel\.app$"),
]


class DynamicCORSMiddleware(BaseHTTPMiddleware):
    """Handles CORS for dynamic Vercel preview URLs not known at startup."""

    async def dispatch(self, request: Request, call_next):
        origin = request.headers.get("origin", "")

        # Check static origins first
        is_allowed = origin in settings.ALLOWED_ORIGINS

        # Check dynamic patterns (e.g. Vercel preview URLs)
        if not is_allowed:
            is_allowed = any(p.match(origin) for p in ALLOWED_ORIGIN_PATTERNS)

        if request.method == "OPTIONS" and is_allowed:
            response = Response(status_code=200)
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
            response.headers["Access-Control-Allow-Headers"] = "*"
            response.headers["Access-Control-Expose-Headers"] = "X-Request-ID"
            return response

        response = await call_next(request)

        if is_allowed:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
            response.headers["Access-Control-Allow-Headers"] = "*"
            response.headers["Access-Control-Expose-Headers"] = "X-Request-ID"

        return response


def register_cors(app: FastAPI) -> None:
    """Attach CORS middleware to *app* using settings + dynamic Vercel patterns."""
    # Static origins via FastAPI's built-in middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["*"],
        expose_headers=["X-Request-ID"],
    )
    # Dynamic origins (Vercel preview URLs)
    app.add_middleware(DynamicCORSMiddleware)
