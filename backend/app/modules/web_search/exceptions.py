from __future__ import annotations

from app.core.exceptions import AppException


class WebSearchConfigurationError(AppException):
    """Raised when the web search provider is not properly configured.

    Surfaced as 503 — search is optional, so missing config is a service-not-
    ready condition rather than a client error.
    """

    def __init__(
        self,
        message: str = "Web search is not properly configured",
    ) -> None:
        super().__init__(
            code="WEB_SEARCH_CONFIGURATION_ERROR",
            message=message,
            status_code=503,
        )


class WebSearchProviderError(AppException):
    """Raised when the upstream search provider returns an error or is unreachable.

    The raw provider exception (httpx error, JSON decode failure, etc.) is
    logged on the backend; the message returned to clients is sanitised.
    """

    def __init__(
        self,
        message: str = "Web search service is temporarily unavailable",
    ) -> None:
        super().__init__(
            code="WEB_SEARCH_UNAVAILABLE",
            message=message,
            status_code=503,
        )


class WebSearchDisabledError(AppException):
    """Raised when search is explicitly disabled via configuration.

    Distinct from a configuration error so callers can decide whether to
    surface a different message (e.g. "search is turned off" vs "search is
    not configured").
    """

    def __init__(
        self,
        message: str = "Web search is disabled",
    ) -> None:
        super().__init__(
            code="WEB_SEARCH_DISABLED",
            message=message,
            status_code=503,
        )
