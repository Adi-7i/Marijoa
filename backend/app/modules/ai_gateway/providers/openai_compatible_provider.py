from __future__ import annotations

import logging
import time
from collections.abc import Generator
from typing import Any

from openai import OpenAI

from app.core.config import get_settings
from app.modules.ai_gateway.exceptions import (
    AIConfigurationError,
    AIProviderError,
    AIResponseError,
)
from app.modules.ai_gateway.providers.base import AIProvider
from app.modules.ai_gateway.schemas import AICompletionResult, ProviderMessage

logger = logging.getLogger(__name__)


class OpenAICompatibleProvider(AIProvider):
    """AI provider backed by any OpenAI-compatible Responses API endpoint.

    Uses the standard OpenAI Python SDK pointed at OPENAI_COMPATIBLE_BASE_URL.
    This works with OpenAI, Azure-hosted OpenAI-compatible models, and any
    other endpoint that implements the Responses API surface.

    The provider reads all configuration from environment variables only.
    No credentials are logged or surfaced in API responses.
    """

    def __init__(self) -> None:
        settings = get_settings()

        key = settings.OPENAI_COMPATIBLE_API_KEY
        if not key or key == "change_me":
            raise AIConfigurationError(
                "OPENAI_COMPATIBLE_API_KEY is not configured. "
                "Set a valid API key in the environment before starting the service."
            )

        self._client = OpenAI(
            api_key=key,
            base_url=settings.OPENAI_COMPATIBLE_BASE_URL,
        )
        self._model: str = settings.OPENAI_COMPATIBLE_MODEL
        self._timeout: float = float(settings.AI_REQUEST_TIMEOUT_SECONDS)
        self._max_tokens: int = settings.AI_MAX_OUTPUT_TOKENS
        self._temperature: float = settings.AI_TEMPERATURE

    # ------------------------------------------------------------------
    # AIProvider interface
    # ------------------------------------------------------------------

    def generate_response(
        self,
        messages: list[ProviderMessage],
    ) -> AICompletionResult:
        """Send *messages* to the configured OpenAI-compatible endpoint.

        Args:
            messages: Ordered conversation turns including any system instruction.

        Returns:
            Populated :class:`AICompletionResult`.

        Raises:
            AIConfigurationError: Re-raised if the provider was misconfigured.
            AIProviderError: On timeout, connection failure, or any provider error.
            AIResponseError: If the response payload has an unexpected shape.
        """
        input_dicts: list[dict[str, str]] = [
            {"role": m.role, "content": m.content} for m in messages
        ]

        t0 = time.monotonic()
        try:
            response = self._client.responses.create(
                model=self._model,
                input=input_dicts,
                max_output_tokens=self._max_tokens,
                temperature=self._temperature,
                timeout=self._timeout,
            )
        except AIConfigurationError:
            raise
        except Exception as exc:
            raise self._map_exception(exc) from exc

        latency_ms = round((time.monotonic() - t0) * 1000, 2)

        content = self._extract_content(response)
        usage = self._extract_usage(response)

        logger.debug(
            "OpenAI-compatible response: model=%s latency_ms=%s usage=%s",
            self._model,
            latency_ms,
            usage,
        )

        return AICompletionResult(
            content=content,
            model=self._model,
            provider="openai_compatible",
            usage=usage,
            latency_ms=latency_ms,
        )

    def stream_response(self, messages: list) -> Generator[str, None, None]:
        """Stream text deltas from the configured OpenAI-compatible endpoint.

        Args:
            messages: Ordered conversation turns including any system instruction.

        Yields:
            str: Non-empty text delta chunks as they arrive from the provider.

        Raises:
            AIConfigurationError: If authentication fails.
            AIProviderError: On rate limit, timeout, connection failure, or provider error.
        """
        input_dicts: list[dict[str, str]] = [
            {"role": m.role, "content": m.content} for m in messages
        ]
        try:
            with self._client.responses.stream(
                model=self._model,
                input=input_dicts,
                max_output_tokens=self._max_tokens,
                temperature=self._temperature,
                timeout=self._timeout,
            ) as stream:
                for text in stream.text_deltas:
                    if text:
                        yield text
        except Exception as exc:
            name = type(exc).__name__
            if "AuthenticationError" in name:
                raise AIConfigurationError("AI authentication failed") from None
            elif "RateLimitError" in name:
                raise AIProviderError("AI rate limit exceeded") from None
            elif "APIConnectionError" in name or "Timeout" in name:
                raise AIProviderError("AI service connection failed") from None
            else:
                raise AIProviderError("AI service returned an error") from None

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _extract_content(response: Any) -> str:
        """Extract text content from the Responses API response.

        Tries the convenience ``output_text`` property first, then falls back
        to traversing ``output[0].content[0].text``.
        """
        if hasattr(response, "output_text"):
            text = response.output_text
            if isinstance(text, str) and text:
                return text

        try:
            text = response.output[0].content[0].text
            if isinstance(text, str):
                return text
        except (AttributeError, IndexError, TypeError):
            pass

        raise AIResponseError(
            "AI service returned an invalid response: unable to extract text content."
        )

    @staticmethod
    def _extract_usage(response: Any) -> dict[str, int] | None:
        """Extract token usage from the response, returning None on failure."""
        try:
            usage = response.usage
            return {
                "input_tokens": int(usage.input_tokens),
                "output_tokens": int(usage.output_tokens),
            }
        except Exception:  # noqa: BLE001
            return None

    @staticmethod
    def _map_exception(exc: Exception) -> AIProviderError:
        """Map an OpenAI SDK exception to an :class:`AIProviderError`.

        Exception class names are matched by string to avoid a hard dependency
        on the openai exception hierarchy at import time.
        Sanitised error type names are included in details; raw messages are
        not forwarded to avoid leaking credentials or internal URLs.
        """
        exc_type = type(exc).__name__

        if exc_type in ("APITimeoutError", "TimeoutError"):
            return AIProviderError(
                message="AI service request timed out. Please try again.",
                details={"error_type": exc_type},
            )

        if exc_type == "APIConnectionError":
            return AIProviderError(
                message="Could not connect to the AI service. Please try again later.",
                details={"error_type": exc_type},
            )

        sanitised = exc_type.replace("Error", " Error").strip()
        return AIProviderError(
            message="AI service is temporarily unavailable.",
            details={"error_type": sanitised},
        )
