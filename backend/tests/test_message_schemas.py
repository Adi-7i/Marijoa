"""Unit tests for message Pydantic schemas and the MessageRole enum.

No database or network access required.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

import pytest

from app.modules.messages.model import MessageRole
from app.modules.messages.schemas import (
    InternalMessageCreate,
    MessageCreate,
    MessageRead,
)


# ---------------------------------------------------------------------------
# MessageCreate — content validation
# ---------------------------------------------------------------------------


def test_message_create_valid_content() -> None:
    mc = MessageCreate(content="Hello, world!")
    assert mc.content == "Hello, world!"


def test_message_create_empty_content_rejected() -> None:
    with pytest.raises(Exception):
        MessageCreate(content="")


def test_message_create_over_20000_chars_rejected() -> None:
    with pytest.raises(Exception):
        MessageCreate(content="A" * 20001)


def test_message_create_exactly_20000_chars_accepted() -> None:
    mc = MessageCreate(content="A" * 20000)
    assert len(mc.content) == 20000


def test_message_create_single_char_accepted() -> None:
    mc = MessageCreate(content="x")
    assert mc.content == "x"


# ---------------------------------------------------------------------------
# MessageRole enum — values and type
# ---------------------------------------------------------------------------


def test_message_role_user_value() -> None:
    assert MessageRole.USER.value == "user"


def test_message_role_assistant_value() -> None:
    assert MessageRole.ASSISTANT.value == "assistant"


def test_message_role_system_value() -> None:
    assert MessageRole.SYSTEM.value == "system"


def test_message_role_user_is_str() -> None:
    assert isinstance(MessageRole.USER, str)


def test_message_role_assistant_is_str() -> None:
    assert isinstance(MessageRole.ASSISTANT, str)


def test_message_role_system_is_str() -> None:
    assert isinstance(MessageRole.SYSTEM, str)


def test_all_message_roles_are_str() -> None:
    for role in MessageRole:
        assert isinstance(role, str), f"MessageRole.{role.name} is not str"


# ---------------------------------------------------------------------------
# MessageRead — construction from dict via model_validate
# ---------------------------------------------------------------------------


def _valid_message_read_dict() -> dict:
    now = datetime.now(timezone.utc)
    return {
        "id": str(uuid.uuid4()),
        "chat_id": str(uuid.uuid4()),
        "user_id": str(uuid.uuid4()),
        "role": MessageRole.USER,
        "content": "Test message content",
        "model": None,
        "metadata_json": None,
        "created_at": now,
        "updated_at": now,
    }


def test_message_read_model_validate_from_dict() -> None:
    data = _valid_message_read_dict()
    mr = MessageRead.model_validate(data)
    assert mr.content == "Test message content"


def test_message_read_model_validate_preserves_role() -> None:
    data = _valid_message_read_dict()
    data["role"] = MessageRole.ASSISTANT
    mr = MessageRead.model_validate(data)
    assert mr.role == MessageRole.ASSISTANT


def test_message_read_model_validate_nullable_user_id() -> None:
    data = _valid_message_read_dict()
    data["user_id"] = None
    mr = MessageRead.model_validate(data)
    assert mr.user_id is None


def test_message_read_model_validate_with_model_field() -> None:
    data = _valid_message_read_dict()
    data["model"] = "gpt-4o"
    data["role"] = MessageRole.ASSISTANT
    mr = MessageRead.model_validate(data)
    assert mr.model == "gpt-4o"


def test_message_read_model_validate_with_metadata() -> None:
    data = _valid_message_read_dict()
    data["metadata_json"] = {"provider": "openai_compatible", "latency_ms": 123.4}
    mr = MessageRead.model_validate(data)
    assert mr.metadata_json is not None
    assert mr.metadata_json["provider"] == "openai_compatible"


# ---------------------------------------------------------------------------
# InternalMessageCreate — internal schema rules
# ---------------------------------------------------------------------------


def test_internal_message_create_user_id_none_is_valid() -> None:
    imc = InternalMessageCreate(
        chat_id=uuid.uuid4(),
        user_id=None,
        role=MessageRole.ASSISTANT,
        content="AI reply",
    )
    assert imc.user_id is None


def test_internal_message_create_requires_role() -> None:
    with pytest.raises(Exception):
        InternalMessageCreate(  # type: ignore[call-arg]
            chat_id=uuid.uuid4(),
            user_id=None,
            content="missing role",
        )


def test_internal_message_create_requires_chat_id() -> None:
    with pytest.raises(Exception):
        InternalMessageCreate(  # type: ignore[call-arg]
            user_id=uuid.uuid4(),
            role=MessageRole.USER,
            content="missing chat_id",
        )


def test_internal_message_create_optional_model_field() -> None:
    imc = InternalMessageCreate(
        chat_id=uuid.uuid4(),
        user_id=None,
        role=MessageRole.ASSISTANT,
        content="reply",
        model="gpt-4o",
    )
    assert imc.model == "gpt-4o"


def test_internal_message_create_optional_metadata_json() -> None:
    imc = InternalMessageCreate(
        chat_id=uuid.uuid4(),
        user_id=None,
        role=MessageRole.ASSISTANT,
        content="reply",
        metadata_json={"key": "value"},
    )
    assert imc.metadata_json == {"key": "value"}


def test_internal_message_create_with_user_id() -> None:
    uid = uuid.uuid4()
    imc = InternalMessageCreate(
        chat_id=uuid.uuid4(),
        user_id=uid,
        role=MessageRole.USER,
        content="user message",
    )
    assert imc.user_id == uid
    assert imc.role == MessageRole.USER
