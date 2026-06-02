"""Unit tests for OpenAICompatibleProvider streaming behaviour.

Covers the new ``responses.create(stream=True)`` event-iteration path and the
``_extract_stream_delta`` helper that pulls text out of provider stream events.
No real OpenAI client is used — the SDK is stubbed in sys.modules.
"""
from __future__ import annotations

import sys
from types import ModuleType, SimpleNamespace
from unittest.mock import MagicMock, patch


def _stub_openai() -> None:
    if "openai" not in sys.modules:
        fake_openai = ModuleType("openai")
        fake_openai.OpenAI = MagicMock()  # type: ignore[attr-defined]
        sys.modules["openai"] = fake_openai
        sys.modules.setdefault("openai.types", ModuleType("openai.types"))


_stub_openai()

from app.modules.ai_gateway.exceptions import (  # noqa: E402
    AIConfigurationError,
    AIProviderError,
)


_SETTINGS_PATH = (
    "app.modules.ai_gateway.providers.openai_compatible_provider.get_settings"
)
_OPENAI_PATH = "app.modules.ai_gateway.providers.openai_compatible_provider.OpenAI"


def _make_settings() -> MagicMock:
    settings = MagicMock()
    settings.OPENAI_COMPATIBLE_API_KEY = "real-key"
    settings.OPENAI_COMPATIBLE_BASE_URL = "https://example.test/openai/v1"
    settings.OPENAI_COMPATIBLE_MODEL = "claude-sonnet-4-6"
    settings.AI_REQUEST_TIMEOUT_SECONDS = 30.0
    settings.AI_MAX_OUTPUT_TOKENS = 1200
    settings.AI_TEMPERATURE = 0.4
    return settings


def _make_provider():
    from app.modules.ai_gateway.providers.openai_compatible_provider import (
        OpenAICompatibleProvider,
    )

    mock_client = MagicMock()
    with patch(_SETTINGS_PATH, return_value=_make_settings()), patch(
        _OPENAI_PATH, return_value=mock_client
    ):
        provider = OpenAICompatibleProvider()
    return provider, mock_client


# ---------------------------------------------------------------------------
# _extract_stream_delta
# ---------------------------------------------------------------------------


def test_extract_delta_from_response_output_text_delta_event() -> None:
    from app.modules.ai_gateway.providers.openai_compatible_provider import (
        OpenAICompatibleProvider,
    )

    event = SimpleNamespace(type="response.output_text.delta", delta="Hello")
    assert OpenAICompatibleProvider._extract_stream_delta(event) == "Hello"


def test_extract_delta_skips_non_delta_events() -> None:
    from app.modules.ai_gateway.providers.openai_compatible_provider import (
        OpenAICompatibleProvider,
    )

    for evt_type in (
        "response.created",
        "response.in_progress",
        "response.completed",
        "response.output_item.added",
    ):
        event = SimpleNamespace(type=evt_type, delta="ignored")
        assert OpenAICompatibleProvider._extract_stream_delta(event) == ""


def test_extract_delta_falls_back_to_text_attribute() -> None:
    from app.modules.ai_gateway.providers.openai_compatible_provider import (
        OpenAICompatibleProvider,
    )

    event = SimpleNamespace(type="response.output_text.delta", delta=None, text=" world")
    assert OpenAICompatibleProvider._extract_stream_delta(event) == " world"


def test_extract_delta_handles_event_attribute_alias() -> None:
    from app.modules.ai_gateway.providers.openai_compatible_provider import (
        OpenAICompatibleProvider,
    )

    event = SimpleNamespace(event="response.output_text.delta", delta="ok")
    assert OpenAICompatibleProvider._extract_stream_delta(event) == "ok"


def test_extract_delta_returns_empty_when_no_payload() -> None:
    from app.modules.ai_gateway.providers.openai_compatible_provider import (
        OpenAICompatibleProvider,
    )

    event = SimpleNamespace(type="response.output_text.delta")
    assert OpenAICompatibleProvider._extract_stream_delta(event) == ""


# ---------------------------------------------------------------------------
# stream_response — end-to-end through fake event iterator
# ---------------------------------------------------------------------------


def test_stream_response_yields_text_deltas_only() -> None:
    provider, client = _make_provider()

    events = [
        SimpleNamespace(type="response.created"),
        SimpleNamespace(type="response.output_text.delta", delta="Hello"),
        SimpleNamespace(type="response.output_text.delta", delta=" world"),
        SimpleNamespace(type="response.output_text.done"),
        SimpleNamespace(type="response.completed"),
    ]
    client.responses.create.return_value = iter(events)

    chunks = list(provider.stream_response([SimpleNamespace(role="user", content="hi")]))

    assert chunks == ["Hello", " world"]
    client.responses.create.assert_called_once()
    # Confirms we used the canonical stream=True iterator path.
    call_kwargs = client.responses.create.call_args.kwargs
    assert call_kwargs["stream"] is True


def test_stream_response_maps_authentication_to_configuration_error() -> None:
    provider, client = _make_provider()

    class AuthenticationError(Exception):
        pass

    client.responses.create.side_effect = AuthenticationError("bad key")

    import pytest

    with pytest.raises(AIConfigurationError):
        list(provider.stream_response([SimpleNamespace(role="user", content="hi")]))


def test_stream_response_maps_unknown_to_provider_error_with_details() -> None:
    provider, client = _make_provider()

    class WeirdProxyError(Exception):
        pass

    client.responses.create.side_effect = WeirdProxyError("boom")

    import pytest

    with pytest.raises(AIProviderError) as excinfo:
        list(provider.stream_response([SimpleNamespace(role="user", content="hi")]))

    # Sanitised exception type name surfaces in details so operators can debug
    # via the SSE error payload without leaking the raw message.
    assert excinfo.value.details == {"error_type": "WeirdProxyError"}
