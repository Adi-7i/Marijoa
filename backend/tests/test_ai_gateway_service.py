"""Unit tests for the AI Gateway service (ai_respond).

No real database or real API calls are made. All dependencies are replaced
with MagicMock objects and the relevant functions are patched at the service
module level. The openai package is also stubbed in sys.modules so provider
modules can be imported even when openai is not installed.
"""
from __future__ import annotations

import sys
import uuid
from datetime import datetime, timezone
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
from app.modules.ai_gateway.schemas import AICompletionResult, AIRespondResponse  # noqa: E402
from app.modules.messages.model import MessageRole  # noqa: E402
from app.modules.messages.schemas import MessageRead  # noqa: E402


# ---------------------------------------------------------------------------
# Patch targets — all resolved at app.modules.ai_gateway.service level
# ---------------------------------------------------------------------------

_GET_CHAT = "app.modules.ai_gateway.service.get_chat"
_SAVE_USER_MSG = "app.modules.ai_gateway.service.message_service.save_user_message"
_GET_RECENT = "app.modules.ai_gateway.service.message_service.get_recent_for_ai"
_SAVE_ASST_MSG = "app.modules.ai_gateway.service.message_service.save_assistant_message"
_WS_REPO = "app.modules.ai_gateway.service.ws_repo.get_workspace_by_id"
_GET_PROVIDER = "app.modules.ai_gateway.service._get_provider"
_MSG_READ_VALIDATE = "app.modules.ai_gateway.service.MessageRead.model_validate"
_GET_SETTINGS = "app.modules.ai_gateway.service.get_settings"


# ---------------------------------------------------------------------------
# Helpers / factories
# ---------------------------------------------------------------------------


def _make_ai_result(
    content: str = "Hello!",
    model: str = "test",
    provider: str = "openai_compatible",
) -> AICompletionResult:
    return AICompletionResult(
        content=content,
        model=model,
        provider=provider,
        usage={"input_tokens": 10, "output_tokens": 5},
        latency_ms=42.0,
    )


def _make_fake_message(
    role: str = "user",
    content: str = "Test",
) -> MagicMock:
    """Return a MagicMock that resembles a persisted Message ORM object."""
    msg = MagicMock()
    msg.id = uuid.uuid4()
    msg.chat_id = uuid.uuid4()
    msg.user_id = uuid.uuid4() if role == "user" else None
    msg.role = role
    msg.content = content
    msg.model = None if role == "user" else "test"
    msg.metadata_json = None
    msg.created_at = datetime.now(timezone.utc)
    msg.updated_at = datetime.now(timezone.utc)
    return msg


def _make_message_read(role: str = "user", content: str = "Test") -> MessageRead:
    now = datetime.now(timezone.utc)
    return MessageRead(
        id=uuid.uuid4(),
        chat_id=uuid.uuid4(),
        user_id=uuid.uuid4() if role == "user" else None,
        role=MessageRole(role),
        content=content,
        model=None,
        metadata_json=None,
        created_at=now,
        updated_at=now,
    )


def _build_common_mocks(
    *,
    chat_id: uuid.UUID | None = None,
    user_id: uuid.UUID | None = None,
    content: str = "Hello!",
    ai_content: str = "Hello!",
) -> tuple[uuid.UUID, uuid.UUID, str, MagicMock, MagicMock, MagicMock, MagicMock, AICompletionResult]:
    chat_id = chat_id or uuid.uuid4()
    user_id = user_id or uuid.uuid4()

    mock_db = MagicMock()

    # Chat
    mock_chat = MagicMock()
    mock_chat.workspace_id = uuid.uuid4()

    # Messages
    user_msg_orm = _make_fake_message(role="user", content=content)
    asst_msg_orm = _make_fake_message(role="assistant", content=ai_content)

    # AI result
    ai_result = _make_ai_result(content=ai_content)

    return chat_id, user_id, content, mock_db, mock_chat, user_msg_orm, asst_msg_orm, ai_result


# ---------------------------------------------------------------------------
# Test: ai_respond returns AIRespondResponse with user_message and assistant_message
# ---------------------------------------------------------------------------


def test_ai_respond_returns_ai_respond_response() -> None:
    from app.modules.ai_gateway.service import ai_respond

    chat_id, user_id, content, mock_db, mock_chat, user_msg_orm, asst_msg_orm, ai_result = (
        _build_common_mocks()
    )

    user_read = _make_message_read(role="user", content=content)
    asst_read = _make_message_read(role="assistant", content=ai_result.content)

    mock_provider = MagicMock()
    mock_provider.generate_response.return_value = ai_result

    mock_settings = MagicMock()
    mock_settings.AI_MAX_HISTORY_MESSAGES = 20

    mock_workspace = MagicMock()
    mock_workspace.system_instruction = None

    with patch(_GET_SETTINGS, return_value=mock_settings), \
         patch(_GET_CHAT, return_value=mock_chat), \
         patch(_SAVE_USER_MSG, return_value=user_msg_orm), \
         patch(_GET_RECENT, return_value=[]), \
         patch(_WS_REPO, return_value=mock_workspace), \
         patch(_GET_PROVIDER, return_value=mock_provider), \
         patch(_SAVE_ASST_MSG, return_value=asst_msg_orm), \
         patch(_MSG_READ_VALIDATE, side_effect=lambda x: user_read if x is user_msg_orm else asst_read):

        response = ai_respond(mock_db, chat_id=chat_id, content=content, user_id=user_id)

    assert isinstance(response, AIRespondResponse)
    assert response.user_message is user_read
    assert response.assistant_message is asst_read


# ---------------------------------------------------------------------------
# Test: save_user_message called with correct chat_id, content, user_id
# ---------------------------------------------------------------------------


def test_save_user_message_called_with_correct_args() -> None:
    from app.modules.ai_gateway.service import ai_respond

    chat_id, user_id, content, mock_db, mock_chat, user_msg_orm, asst_msg_orm, ai_result = (
        _build_common_mocks(content="User's question")
    )

    user_read = _make_message_read(role="user", content=content)
    asst_read = _make_message_read(role="assistant", content=ai_result.content)

    mock_provider = MagicMock()
    mock_provider.generate_response.return_value = ai_result

    mock_settings = MagicMock()
    mock_settings.AI_MAX_HISTORY_MESSAGES = 20

    mock_workspace = MagicMock()
    mock_workspace.system_instruction = None

    with patch(_GET_SETTINGS, return_value=mock_settings), \
         patch(_GET_CHAT, return_value=mock_chat), \
         patch(_SAVE_USER_MSG, return_value=user_msg_orm) as mock_save_user, \
         patch(_GET_RECENT, return_value=[]), \
         patch(_WS_REPO, return_value=mock_workspace), \
         patch(_GET_PROVIDER, return_value=mock_provider), \
         patch(_SAVE_ASST_MSG, return_value=asst_msg_orm), \
         patch(_MSG_READ_VALIDATE, side_effect=lambda x: user_read if x is user_msg_orm else asst_read):

        ai_respond(mock_db, chat_id=chat_id, content=content, user_id=user_id)

    mock_save_user.assert_called_once_with(
        mock_db,
        chat_id=chat_id,
        content=content,
        user_id=user_id,
    )


# ---------------------------------------------------------------------------
# Test: save_assistant_message called after successful provider response
# ---------------------------------------------------------------------------


def test_save_assistant_message_called_after_provider_response() -> None:
    from app.modules.ai_gateway.service import ai_respond

    chat_id, user_id, content, mock_db, mock_chat, user_msg_orm, asst_msg_orm, ai_result = (
        _build_common_mocks(ai_content="AI reply text")
    )

    user_read = _make_message_read(role="user", content=content)
    asst_read = _make_message_read(role="assistant", content="AI reply text")

    mock_provider = MagicMock()
    mock_provider.generate_response.return_value = ai_result

    mock_settings = MagicMock()
    mock_settings.AI_MAX_HISTORY_MESSAGES = 20

    mock_workspace = MagicMock()
    mock_workspace.system_instruction = None

    with patch(_GET_SETTINGS, return_value=mock_settings), \
         patch(_GET_CHAT, return_value=mock_chat), \
         patch(_SAVE_USER_MSG, return_value=user_msg_orm), \
         patch(_GET_RECENT, return_value=[]), \
         patch(_WS_REPO, return_value=mock_workspace), \
         patch(_GET_PROVIDER, return_value=mock_provider), \
         patch(_SAVE_ASST_MSG, return_value=asst_msg_orm) as mock_save_asst, \
         patch(_MSG_READ_VALIDATE, side_effect=lambda x: user_read if x is user_msg_orm else asst_read):

        ai_respond(mock_db, chat_id=chat_id, content=content, user_id=user_id)

    mock_save_asst.assert_called_once_with(
        mock_db,
        chat_id=chat_id,
        content=ai_result.content,
        model=ai_result.model,
        metadata_json={
            "provider": ai_result.provider,
            "usage": ai_result.usage,
            "latency_ms": ai_result.latency_ms,
        },
    )


# ---------------------------------------------------------------------------
# Test: AIProviderError propagates when provider raises it
# ---------------------------------------------------------------------------


def test_ai_provider_error_propagates() -> None:
    from app.modules.ai_gateway.service import ai_respond

    chat_id, user_id, content, mock_db, mock_chat, user_msg_orm, asst_msg_orm, ai_result = (
        _build_common_mocks()
    )

    mock_provider = MagicMock()
    mock_provider.generate_response.side_effect = AIProviderError(
        message="AI service is temporarily unavailable"
    )

    mock_settings = MagicMock()
    mock_settings.AI_MAX_HISTORY_MESSAGES = 20

    mock_workspace = MagicMock()
    mock_workspace.system_instruction = None

    user_read = _make_message_read(role="user", content=content)

    with patch(_GET_SETTINGS, return_value=mock_settings), \
         patch(_GET_CHAT, return_value=mock_chat), \
         patch(_SAVE_USER_MSG, return_value=user_msg_orm), \
         patch(_GET_RECENT, return_value=[]), \
         patch(_WS_REPO, return_value=mock_workspace), \
         patch(_GET_PROVIDER, return_value=mock_provider), \
         patch(_SAVE_ASST_MSG, return_value=MagicMock()), \
         patch(_MSG_READ_VALIDATE, side_effect=lambda x: user_read):

        with pytest.raises(AIProviderError):
            ai_respond(mock_db, chat_id=chat_id, content=content, user_id=user_id)


# ---------------------------------------------------------------------------
# Test: get_chat is called to verify chat existence and access
# ---------------------------------------------------------------------------


def test_get_chat_called_with_correct_args() -> None:
    from app.modules.ai_gateway.service import ai_respond

    chat_id, user_id, content, mock_db, mock_chat, user_msg_orm, asst_msg_orm, ai_result = (
        _build_common_mocks()
    )

    user_read = _make_message_read(role="user", content=content)
    asst_read = _make_message_read(role="assistant", content=ai_result.content)

    mock_provider = MagicMock()
    mock_provider.generate_response.return_value = ai_result

    mock_settings = MagicMock()
    mock_settings.AI_MAX_HISTORY_MESSAGES = 20

    mock_workspace = MagicMock()
    mock_workspace.system_instruction = None

    with patch(_GET_SETTINGS, return_value=mock_settings), \
         patch(_GET_CHAT, return_value=mock_chat) as mock_get_chat, \
         patch(_SAVE_USER_MSG, return_value=user_msg_orm), \
         patch(_GET_RECENT, return_value=[]), \
         patch(_WS_REPO, return_value=mock_workspace), \
         patch(_GET_PROVIDER, return_value=mock_provider), \
         patch(_SAVE_ASST_MSG, return_value=asst_msg_orm), \
         patch(_MSG_READ_VALIDATE, side_effect=lambda x: user_read if x is user_msg_orm else asst_read):

        ai_respond(mock_db, chat_id=chat_id, content=content, user_id=user_id)

    mock_get_chat.assert_called_once_with(mock_db, chat_id, user_id)


# ---------------------------------------------------------------------------
# Test: assistant message NOT saved when provider raises
# ---------------------------------------------------------------------------


def test_save_assistant_message_not_called_on_provider_error() -> None:
    from app.modules.ai_gateway.service import ai_respond

    chat_id, user_id, content, mock_db, mock_chat, user_msg_orm, asst_msg_orm, ai_result = (
        _build_common_mocks()
    )

    mock_provider = MagicMock()
    mock_provider.generate_response.side_effect = AIProviderError("failure")

    mock_settings = MagicMock()
    mock_settings.AI_MAX_HISTORY_MESSAGES = 20

    mock_workspace = MagicMock()
    mock_workspace.system_instruction = None

    user_read = _make_message_read(role="user", content=content)

    with patch(_GET_SETTINGS, return_value=mock_settings), \
         patch(_GET_CHAT, return_value=mock_chat), \
         patch(_SAVE_USER_MSG, return_value=user_msg_orm), \
         patch(_GET_RECENT, return_value=[]), \
         patch(_WS_REPO, return_value=mock_workspace), \
         patch(_GET_PROVIDER, return_value=mock_provider), \
         patch(_SAVE_ASST_MSG) as mock_save_asst, \
         patch(_MSG_READ_VALIDATE, side_effect=lambda x: user_read):

        with pytest.raises(AIProviderError):
            ai_respond(mock_db, chat_id=chat_id, content=content, user_id=user_id)

    mock_save_asst.assert_not_called()