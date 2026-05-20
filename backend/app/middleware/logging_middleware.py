"""
Request / response logging middleware.

Logs every incoming request and its outcome with:
  - method, path, query params
  - response status code
  - elapsed time in ms
  - client IP
  - request ID (injected into response headers as X-Request-ID)
"""
import time
import uuid
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.utils.logger import get_logger

logger = get_logger("rhc.http")

# Paths to skip logging (health checks, docs)
_SKIP_PATHS = {"/", "/api/health", "/api/docs", "/api/redoc", "/api/openapi.json"}


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        # Skip noisy paths
        if request.url.path in _SKIP_PATHS:
            return await call_next(request)

        request_id = str(uuid.uuid4())[:8]
        start = time.perf_counter()

        # Log incoming request
        logger.info(
            f"→ {request.method} {request.url.path}",
            extra={
                "request_id": request_id,
                "method":     request.method,
                "path":       request.url.path,
                "query":      str(request.url.query) or None,
                "client_ip":  request.client.host if request.client else "unknown",
            },
        )

        try:
            response: Response = await call_next(request)
        except Exception as exc:
            elapsed = round((time.perf_counter() - start) * 1000, 2)
            logger.error(
                f"✗ {request.method} {request.url.path} — unhandled exception",
                extra={"request_id": request_id, "elapsed_ms": elapsed},
                exc_info=exc,
            )
            raise

        elapsed = round((time.perf_counter() - start) * 1000, 2)
        level = logger.warning if response.status_code >= 400 else logger.info
        level(
            f"← {response.status_code} {request.method} {request.url.path} ({elapsed}ms)",
            extra={
                "request_id":  request_id,
                "status_code": response.status_code,
                "elapsed_ms":  elapsed,
            },
        )

        response.headers["X-Request-ID"] = request_id
        return response
