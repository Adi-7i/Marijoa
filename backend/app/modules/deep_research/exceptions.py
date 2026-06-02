from __future__ import annotations

from app.core.exceptions import AppException


class DeepResearchDisabledError(AppException):
    def __init__(self) -> None:
        super().__init__(
            code="DEEP_RESEARCH_DISABLED",
            message="Deep Research is disabled in configuration.",
            status_code=503,
        )


class DeepResearchPipelineError(Exception):
    """Internal pipeline error with a sanitized message."""

