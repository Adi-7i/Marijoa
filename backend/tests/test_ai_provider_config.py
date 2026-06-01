"""Unit tests for OpenAICompatibleProvider configuration validation.

No real API calls are made. All external dependencies (settings, OpenAI client)
are patched using unittest.mock. The openai package is also stubbed in
sys.modules so the provider module can be imported even when openai is not
installed in the test environment.
"""
from __future__ import annotations

import sys
from types import ModuleType
from unittest.mock import MagicMock, patch

import pytest


# ---------------------------------------------------------------------------
# Stub the 'openai' package in sys.modules before any provider import so the
# module-level `from openai import OpenAI` does not raise ModuleNotFoundError.
# ---------------------------------------------------------------------------

def _stub_openai() -> None:
    if "openai" not in sys.modules:
        fake_openai = ModuleType("openai")
        fake_openai.OpenAI = MagicMock()  # type: ignore[attr-defined]
        sys.modules["openai"] = fake_openai
        sys.modules.setdefault("openai.types", ModuleType("openai.types"))

_stub_openai()

from app.modules.ai_gateway.exceptions import AIConfigurationError  # noqa: E402


_SETTINGS_PATH = "app.modules.ai_gateway.providers.openai_compatible_provider.get_settings"
_OPENAI_PATH = "app.modules.ai_gateway.providers.openai_compatible_provider.OpenAI"


def _make_settings(api_key: str) -> MagicMock:
    """Build a MagicMock that looks like the app settings object."""
    settings = MagicMock()
    settings.OPENAI_COMPATIBLE_API_KEY = api_key
    settings.OPENAI_COMPATIBLE_BASE_URL = "https://example.openai.azure.com/openai/v1"
    settings.OPENAI_COMPATIBLE_MODEL = "claude-sonnet-4-6"
    settings.AI_REQUEST_TIMEOUT_SECONDS = 30.0
    settings.AI_MAX_OUTPUT_TOKENS = 1200
    settings.AI_TEMPERATURE = 0.4
    return settings


# ---------------------------------------------------------------------------
# Raises AIConfigurationError for placeholder key "change_me"
# ---------------------------------------------------------------------------


def test_raises_configuration_error_for_change_me_key() -> None:
    from app.modules.ai_gateway.providers.openai_compatible_provider import OpenAICompatibleProvider

    mock_settings = _make_settings("change_me")

    with patch(_SETTINGS_PATH, return_value=mock_settings), \
         patch(_OPENAI_PATH) as mock_openai_cls:

        with pytest.raises(AIConfigurationError):
            OpenAICompatibleProvider()

        # OpenAI client should NOT have been instantiated
        mock_openai_cls.assert_not_called()


# ---------------------------------------------------------------------------
# Raises AIConfigurationError for empty string key
# ---------------------------------------------------------------------------


def test_raises_configuration_error_for_empty_key() -> None:
    from app.modules.ai_gateway.providers.openai_compatible_provider import OpenAICompatibleProvider

    mock_settings = _make_settings("")

    with patch(_SETTINGS_PATH, return_value=mock_settings), \
         patch(_OPENAI_PATH) as mock_openai_cls:

        with pytest.raises(AIConfigurationError):
            OpenAICompatibleProvider()

        mock_openai_cls.assert_not_called()


# ---------------------------------------------------------------------------
# Succeeds and constructs OpenAI client with a valid key
# ---------------------------------------------------------------------------


def test_succeeds_with_valid_api_key() -> None:
    from app.modules.ai_gateway.providers.openai_compatible_provider import OpenAICompatibleProvider

    valid_key = "sk-valid-key-abc123"
    mock_settings = _make_settings(valid_key)
    mock_client_instance = MagicMock()

    with patch(_SETTINGS_PATH, return_value=mock_settings), \
         patch(_OPENAI_PATH, return_value=mock_client_instance) as mock_openai_cls:

        provider = OpenAICompatibleProvider()

        # OpenAI client must have been created with correct credentials
        mock_openai_cls.assert_called_once_with(
            api_key=valid_key,
            base_url=mock_settings.OPENAI_COMPATIBLE_BASE_URL,
        )

        # Provider attributes populated from settings
        assert provider._model == mock_settings.OPENAI_COMPATIBLE_MODEL
        assert provider._max_tokens == mock_settings.AI_MAX_OUTPUT_TOKENS
        assert provider._temperature == mock_settings.AI_TEMPERATURE


# ---------------------------------------------------------------------------
# AIConfigurationError carries expected metadata
# ---------------------------------------------------------------------------


def test_configuration_error_has_503_status_code() -> None:
    error = AIConfigurationError("test error")
    assert error.status_code == 503


def test_configuration_error_has_expected_code() -> None:
    error = AIConfigurationError("test error")
    assert error.code == "AI_CONFIGURATION_ERROR"


def test_configuration_error_message_references_correct_env_var() -> None:
    from app.modules.ai_gateway.providers.openai_compatible_provider import OpenAICompatibleProvider

    mock_settings = _make_settings("change_me")

    with patch(_SETTINGS_PATH, return_value=mock_settings), \
         patch(_OPENAI_PATH):

        with pytest.raises(AIConfigurationError) as exc_info:
            OpenAICompatibleProvider()

        assert "OPENAI_COMPATIBLE_API_KEY" in str(exc_info.value.message)
