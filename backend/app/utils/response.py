"""
Standardised API response envelope helpers.

Every successful response follows the shape:
    {
        "success": true,
        "message": "...",
        "data": { ... }          # or list
    }

Every error response (via exception handlers) follows:
    {
        "success": false,
        "message": "...",
        "errors": [ ... ]        # optional detail list
    }
"""
from typing import Any, Optional
from fastapi.responses import JSONResponse


def success_response(
    data: Any = None,
    message: str = "Success",
    status_code: int = 200,
) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={
            "success": True,
            "message": message,
            "data": data,
        },
    )


def created_response(data: Any = None, message: str = "Created successfully") -> JSONResponse:
    return success_response(data=data, message=message, status_code=201)


def error_response(
    message: str = "An error occurred",
    errors: Optional[list] = None,
    status_code: int = 400,
) -> JSONResponse:
    body: dict = {"success": False, "message": message}
    if errors:
        body["errors"] = errors
    return JSONResponse(status_code=status_code, content=body)
