from __future__ import annotations

import logging
from typing import Any
from uuid import UUID

from fastapi import Request
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)


class AppException(Exception):
    """Base application exception."""

    def __init__(
        self,
        *,
        code: str,
        message: str,
        status_code: int = 400,
        details: Any = None,
    ) -> None:
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details
        super().__init__(message)


def _error_body(code: str, message: str, details: Any = None) -> dict[str, Any]:
    return {"error": {"code": code, "message": message, "details": details}}


async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content=_error_body(exc.code, exc.message, exc.details),
    )


class ResourceNotFoundError(AppException):
    """Raised when a requested resource cannot be found."""

    def __init__(self, resource: str, identifier: Any = None) -> None:
        detail = f" '{identifier}'" if identifier is not None else ""
        super().__init__(
            code="NOT_FOUND",
            message=f"{resource}{detail} not found",
            status_code=404,
        )


class ConflictError(AppException):
    """Raised when an operation would violate a uniqueness or business constraint."""

    def __init__(self, message: str, details: Any = None) -> None:
        super().__init__(
            code="CONFLICT",
            message=message,
            status_code=409,
            details=details,
        )


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content=_error_body(
            code="INTERNAL_SERVER_ERROR",
            message="Something went wrong",
        ),
    )
