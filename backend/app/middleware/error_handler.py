"""
Centralised exception / error handling.

Registers handlers on the FastAPI app for:
  - RequestValidationError  → 422 with field-level detail
  - HTTPException           → pass-through with envelope
  - Generic Exception       → 500 with safe message
"""
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.utils.logger import get_logger

logger = get_logger("rhc.errors")


def _error_body(message: str, errors: list | None = None) -> dict:
    body = {"success": False, "message": message}
    if errors:
        body["errors"] = errors
    return body


def register_error_handlers(app: FastAPI) -> None:
    """Attach all exception handlers to *app*."""

    # ── 422 Validation errors ─────────────────────────────────────────────────
    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        errors = [
            {
                "field":   " → ".join(str(loc) for loc in err["loc"] if loc != "body"),
                "message": err["msg"],
                "type":    err["type"],
            }
            for err in exc.errors()
        ]
        logger.warning(
            f"Validation error on {request.method} {request.url.path}",
            extra={"errors": errors},
        )
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=_error_body("Validation failed. Please check your input.", errors),
        )

    # ── HTTP exceptions ───────────────────────────────────────────────────────
    @app.exception_handler(HTTPException)
    async def http_exception_handler(
        request: Request, exc: HTTPException
    ) -> JSONResponse:
        if exc.status_code >= 500:
            logger.error(
                f"HTTP {exc.status_code} on {request.method} {request.url.path}: {exc.detail}"
            )
        else:
            logger.warning(
                f"HTTP {exc.status_code} on {request.method} {request.url.path}: {exc.detail}"
            )
        return JSONResponse(
            status_code=exc.status_code,
            content=_error_body(str(exc.detail)),
            headers=getattr(exc, "headers", None),
        )

    # ── Catch-all 500 ─────────────────────────────────────────────────────────
    @app.exception_handler(Exception)
    async def unhandled_exception_handler(
        request: Request, exc: Exception
    ) -> JSONResponse:
        logger.error(
            f"Unhandled exception on {request.method} {request.url.path}",
            exc_info=exc,
        )
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=_error_body(
                "An unexpected error occurred. Please try again later."
            ),
        )
