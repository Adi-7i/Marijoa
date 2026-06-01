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

        Uses the canonical ``responses.create(stream=True)`` event iterator,
        which is broadly supported across upstreams (OpenAI, Azure OpenAI,
        Anthropic-on-Azure compatible proxies, vLLM, etc.). The streaming
        helper context manager (``responses.stream``) relies on richer
        client-side state that some proxies do not return, so we prefer the
        lower-level event iterator and pull text from
        ``response.output_text.delta`` events.

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
            stream = self._client.responses.create(
                model=self._model,
                input=input_dicts,
                max_output_tokens=self._max_tokens,
                temperature=self._temperature,
                stream=True,
                timeout=self._timeout,
            )
            for event in stream:
                delta = self._extract_stream_delta(event)
                if delta:
                    yield delta
        except Exception as exc:
            name = type(exc).__name__
            # Log full traceback so operators can diagnose the underlying
            # provider failure; the public message stays sanitised.
            logger.exception(
                "OpenAI-compatible stream failed: model=%s exc_type=%s",
                self._model,
                name,
            )
            if "AuthenticationError" in name:
                raise AIConfigurationError("AI authentication failed") from None
            if "RateLimitError" in name:
                raise AIProviderError(
                    "AI rate limit exceeded",
                    details={"error_type": name},
                ) from None
            if "APIConnectionError" in name or "Timeout" in name:
                raise AIProviderError(
                    "AI service connection failed",
                    details={"error_type": name},
                ) from None
            raise AIProviderError(
                "AI service is temporarily unavailable",
                details={"error_type": name},
            ) from None

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _extract_stream_delta(event: Any) -> str:
        """Pull a text delta out of a Responses-API stream event.

        Different upstreams emit slightly different event shapes; we accept
        any combination of ``type``/``event``/``delta``/``text`` that carries
        a non-empty string. Unknown events return ``""`` and are skipped.
        """
        event_type = getattr(event, "type", None) or getattr(event, "event", None) or ""
        # Only text-delta events carry incremental content; everything else
        # (response.created, response.completed, output_item.added, etc.) is
        # ignored.
        if not isinstance(event_type, str):
            return ""
        if not (event_type.endswith(".delta") or event_type.endswith("_delta")):
            return ""

        delta = getattr(event, "delta", None)
        if isinstance(delta, str) and delta:
            return delta
        # Some proxies put the chunk under .text instead of .delta.
        text = getattr(event, "text", None)
        if isinstance(text, str) and text:
            return text
        # Or as a nested object with .value.
        if delta is not None:
            value = getattr(delta, "value", None)
            if isinstance(value, str) and value:
                return value
        return ""

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
