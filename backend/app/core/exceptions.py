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


class AuthenticationError(AppException):
    """Raised for invalid/missing/expired credentials — always 401."""

    def __init__(self, message: str = "Authentication required") -> None:
        super().__init__(code="UNAUTHORIZED", message=message, status_code=401)


class AuthorizationError(AppException):
    """Raised when an authenticated user lacks permission — always 403."""

    def __init__(self, message: str = "Insufficient permissions") -> None:
        super().__init__(code="FORBIDDEN", message=message, status_code=403)


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


class InvalidOperationError(AppException):
    """Raised when a logically invalid operation is attempted (e.g., bad status transition)."""

    def __init__(self, message: str, details: Any = None) -> None:
        super().__init__(
            code="BAD_REQUEST",
            message=message,
            status_code=400,
            details=details,
        )


class AdminPermissionError(AppException):
    """Raised when an authenticated user lacks admin privileges."""

    def __init__(self, message: str = "Admin access required") -> None:
        super().__init__(code="ADMIN_FORBIDDEN", message=message, status_code=403)


class RedisConfigurationError(AppException):
    """Raised when Redis is not properly configured."""

    def __init__(self, message: str = "Redis is not properly configured") -> None:
        super().__init__(code="REDIS_CONFIGURATION_ERROR", message=message, status_code=503)


class RedisUnavailableError(AppException):
    """Raised when Redis is temporarily unreachable."""

    def __init__(self, message: str = "Redis is temporarily unavailable") -> None:
        super().__init__(code="REDIS_UNAVAILABLE", message=message, status_code=503)


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content=_error_body(
            code="INTERNAL_SERVER_ERROR",
            message="Something went wrong",
        ),
    )
