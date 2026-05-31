from __future__ import annotations

from typing import Any

from app.core.exceptions import AppException


class AIConfigurationError(AppException):
    """Raised when the AI provider is not properly configured.

    Typically indicates a missing or placeholder API key or an invalid
    base URL — surfaced as 503 so the caller knows the service is not ready.
    """

    def __init__(
        self,
        message: str = "AI service is not properly configured",
    ) -> None:
        super().__init__(
            code="AI_CONFIGURATION_ERROR",
            message=message,
            status_code=503,
        )


class AIProviderError(AppException):
    """Raised when the upstream AI provider returns an error or is unreachable.

    The optional *details* field carries sanitised provider-side information
    that is safe to include in the API response body.
    """

    def __init__(
        self,
        message: str = "AI service is temporarily unavailable",
        details: Any = None,
    ) -> None:
        super().__init__(
            code="AI_SERVICE_UNAVAILABLE",
            message=message,
            status_code=503,
            details=details,
        )


class AIResponseError(AppException):
    """Raised when the AI provider returns a response that cannot be parsed.

    Surfaced as 502 (Bad Gateway) because the upstream returned an unexpected
    payload — our service received a response but could not use it.
    """

    def __init__(
        self,
        message: str = "AI service returned an invalid response",
    ) -> None:
        super().__init__(
            code="AI_RESPONSE_ERROR",
            message=message,
            status_code=502,
        )
