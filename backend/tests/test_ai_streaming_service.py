"""Unit tests for the ai_stream() SSE streaming service function.

No real database or real API calls are made. The openai package is stubbed in
sys.modules before any gateway imports. All dependencies are patched at the
service module level.
"""
from __future__ import annotations

import sys
import uuid
from types import ModuleType
from unittest.mock import MagicMock, patch

import pytest


# ---------------------------------------------------------------------------
# Stub the 'openai' package before any gateway import
# ---------------------------------------------------------------------------


def _stub_openai() -> None:
    if "openai" not in sys.modules:
        fake_openai = ModuleType("openai")
        fake_openai.OpenAI = MagicMock()  # type: ignore[attr-defined]
        sys.modules["openai"] = fake_openai
        sys.modules.setdefault("openai.types", ModuleType("openai.types"))


_stub_openai()


from app.modules.ai_gateway.exceptions import AIProviderError  # noqa: E402


# ---------------------------------------------------------------------------
# Patch targets — all resolved at app.modules.ai_gateway.service level
# ---------------------------------------------------------------------------

_GET_CHAT = "app.modules.ai_gateway.service.get_chat"
_SAVE_USER = "app.modules.ai_gateway.service.message_service.save_user_message"
_GET_RECENT = "app.modules.ai_gateway.service.message_service.get_recent_for_ai"
_SAVE_ASST = "app.modules.ai_gateway.service.message_service.save_assistant_message"
_WS_REPO = "app.modules.ai_gateway.service.ws_repo.get_workspace_by_id"
_GET_PROVIDER = "app.modules.ai_gateway.service._get_provider"
_GET_SETTINGS = "app.modules.ai_gateway.service.get_settings"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def collect_events(gen) -> list[str]:
    """Consume generator and return only non-empty SSE event strings."""
    return [s for s in gen if s.strip()]


def parse_event_type(sse_str: str) -> str:
    """Extract the event type name from an SSE string."""
    return sse_str.split("\n")[0].replace("event: ", "")


# ---------------------------------------------------------------------------
# Shared fixture factories
# ---------------------------------------------------------------------------


def _make_settings() -> MagicMock:
    settings = MagicMock()
    settings.AI_MAX_HISTORY_MESSAGES = 20
    settings.OPENAI_COMPATIBLE_MODEL = "test-model"
    return settings


def _make_provider(chunks=("Hello", " world")) -> MagicMock:
    provider = MagicMock()
    provider.stream_response.return_value = iter(chunks)
    return provider


def _make_user_msg() -> MagicMock:
    msg = MagicMock()
    msg.id = uuid.uuid4()
    return msg


def _make_assistant_msg() -> MagicMock:
    msg = MagicMock()
    msg.id = uuid.uuid4()
    return msg


def _make_chat() -> MagicMock:
    chat = MagicMock()
    chat.workspace_id = uuid.uuid4()
    return chat


def _make_workspace() -> MagicMock:
    workspace = MagicMock()
    workspace.system_instruction = None
    return workspace


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


def test_ai_stream_first_event_is_start() -> None:
    from app.modules.ai_gateway.service import ai_stream

    mock_db = MagicMock()
    chat_id = uuid.uuid4()
    user_id = uuid.uuid4()

    mock_chat = _make_chat()
    mock_user_msg = _make_user_msg()
    mock_asst_msg = _make_assistant_msg()
    mock_provider = _make_provider()
    mock_settings = _make_settings()
    mock_workspace = _make_workspace()

    with patch(_GET_SETTINGS, return_value=mock_settings), \
         patch(_GET_CHAT, return_value=mock_chat), \
         patch(_SAVE_USER, return_value=mock_user_msg), \
         patch(_GET_RECENT, return_value=[]), \
         patch(_WS_REPO, return_value=mock_workspace), \
         patch(_GET_PROVIDER, return_value=mock_provider), \
         patch(_SAVE_ASST, return_value=mock_asst_msg):

        gen = ai_stream(mock_db, chat_id=chat_id, content="hi", user_id=user_id)
        events = collect_events(gen)

    assert len(events) > 0
    assert "event: start" in events[0]
    assert str(mock_user_msg.id) in events[0]


def test_ai_stream_yields_token_events() -> None:
    from app.modules.ai_gateway.service import ai_stream

    mock_db = MagicMock()
    chat_id = uuid.uuid4()
    user_id = uuid.uuid4()

    mock_chat = _make_chat()
    mock_user_msg = _make_user_msg()
    mock_asst_msg = _make_assistant_msg()
    mock_provider = _make_provider(chunks=("Hello", " world"))
    mock_settings = _make_settings()
    mock_workspace = _make_workspace()

    with patch(_GET_SETTINGS, return_value=mock_settings), \
         patch(_GET_CHAT, return_value=mock_chat), \
         patch(_SAVE_USER, return_value=mock_user_msg), \
         patch(_GET_RECENT, return_value=[]), \
         patch(_WS_REPO, return_value=mock_workspace), \
         patch(_GET_PROVIDER, return_value=mock_provider), \
         patch(_SAVE_ASST, return_value=mock_asst_msg):

        gen = ai_stream(mock_db, chat_id=chat_id, content="hi", user_id=user_id)
        events = collect_events(gen)

    token_events = [e for e in events if parse_event_type(e) == "token"]
    assert len(token_events) == 2


def test_ai_stream_last_event_is_done() -> None:
    from app.modules.ai_gateway.service import ai_stream

    mock_db = MagicMock()
    chat_id = uuid.uuid4()
    user_id = uuid.uuid4()

    mock_chat = _make_chat()
    mock_user_msg = _make_user_msg()
    mock_asst_msg = _make_assistant_msg()
    mock_provider = _make_provider()
    mock_settings = _make_settings()
    mock_workspace = _make_workspace()

    with patch(_GET_SETTINGS, return_value=mock_settings), \
         patch(_GET_CHAT, return_value=mock_chat), \
         patch(_SAVE_USER, return_value=mock_user_msg), \
         patch(_GET_RECENT, return_value=[]), \
         patch(_WS_REPO, return_value=mock_workspace), \
         patch(_GET_PROVIDER, return_value=mock_provider), \
         patch(_SAVE_ASST, return_value=mock_asst_msg):

        gen = ai_stream(mock_db, chat_id=chat_id, content="hi", user_id=user_id)
        events = collect_events(gen)

    assert len(events) > 0
    assert "event: done" in events[-1]


def test_save_user_message_called() -> None:
    from app.modules.ai_gateway.service import ai_stream

    mock_db = MagicMock()
    chat_id = uuid.uuid4()
    user_id = uuid.uuid4()

    mock_chat = _make_chat()
    mock_user_msg = _make_user_msg()
    mock_asst_msg = _make_assistant_msg()
    mock_provider = _make_provider()
    mock_settings = _make_settings()
    mock_workspace = _make_workspace()

    with patch(_GET_SETTINGS, return_value=mock_settings), \
         patch(_GET_CHAT, return_value=mock_chat), \
         patch(_SAVE_USER, return_value=mock_user_msg) as mock_save_user, \
         patch(_GET_RECENT, return_value=[]), \
         patch(_WS_REPO, return_value=mock_workspace), \
         patch(_GET_PROVIDER, return_value=mock_provider), \
         patch(_SAVE_ASST, return_value=mock_asst_msg):

        gen = ai_stream(mock_db, chat_id=chat_id, content="hi", user_id=user_id)
        list(gen)

    mock_save_user.assert_called_once_with(
        mock_db,
        chat_id=chat_id,
        content="hi",
        user_id=user_id,
    )


def test_save_assistant_message_called_after_streaming() -> None:
    from app.modules.ai_gateway.service import ai_stream

    mock_db = MagicMock()
    chat_id = uuid.uuid4()
    user_id = uuid.uuid4()

    mock_chat = _make_chat()
    mock_user_msg = _make_user_msg()
    mock_asst_msg = _make_assistant_msg()
    mock_provider = _make_provider(chunks=("Hello", " world"))
    mock_settings = _make_settings()
    mock_workspace = _make_workspace()

    with patch(_GET_SETTINGS, return_value=mock_settings), \
         patch(_GET_CHAT, return_value=mock_chat), \
         patch(_SAVE_USER, return_value=mock_user_msg), \
         patch(_GET_RECENT, return_value=[]), \
         patch(_WS_REPO, return_value=mock_workspace), \
         patch(_GET_PROVIDER, return_value=mock_provider), \
         patch(_SAVE_ASST, return_value=mock_asst_msg) as mock_save_asst:

        gen = ai_stream(mock_db, chat_id=chat_id, content="hi", user_id=user_id)
        list(gen)

    mock_save_asst.assert_called_once()


def test_provider_error_yields_error_event() -> None:
    from app.modules.ai_gateway.service import ai_stream

    mock_db = MagicMock()
    chat_id = uuid.uuid4()
    user_id = uuid.uuid4()

    mock_chat = _make_chat()
    mock_user_msg = _make_user_msg()
    mock_provider = MagicMock()
    mock_provider.stream_response.side_effect = AIProviderError("fail")
    mock_settings = _make_settings()
    mock_workspace = _make_workspace()

    with patch(_GET_SETTINGS, return_value=mock_settings), \
         patch(_GET_CHAT, return_value=mock_chat), \
         patch(_SAVE_USER, return_value=mock_user_msg), \
         patch(_GET_RECENT, return_value=[]), \
         patch(_WS_REPO, return_value=mock_workspace), \
         patch(_GET_PROVIDER, return_value=mock_provider), \
         patch(_SAVE_ASST, return_value=MagicMock()):

        gen = ai_stream(mock_db, chat_id=chat_id, content="hi", user_id=user_id)
        events = collect_events(gen)

    event_types = [parse_event_type(e) for e in events]
    assert "error" in event_types
    assert "done" not in event_types


def test_no_assistant_save_on_provider_error() -> None:
    from app.modules.ai_gateway.service import ai_stream

    mock_db = MagicMock()
    chat_id = uuid.uuid4()
    user_id = uuid.uuid4()

    mock_chat = _make_chat()
    mock_user_msg = _make_user_msg()
    mock_provider = MagicMock()
    mock_provider.stream_response.side_effect = AIProviderError("fail")
    mock_settings = _make_settings()
    mock_workspace = _make_workspace()

    with patch(_GET_SETTINGS, return_value=mock_settings), \
         patch(_GET_CHAT, return_value=mock_chat), \
         patch(_SAVE_USER, return_value=mock_user_msg), \
         patch(_GET_RECENT, return_value=[]), \
         patch(_WS_REPO, return_value=mock_workspace), \
         patch(_GET_PROVIDER, return_value=mock_provider), \
         patch(_SAVE_ASST) as mock_save_asst:

        gen = ai_stream(mock_db, chat_id=chat_id, content="hi", user_id=user_id)
        list(gen)

    mock_save_asst.assert_not_called()
