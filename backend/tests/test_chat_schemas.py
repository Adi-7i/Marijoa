"""Unit tests for chat Pydantic schemas.

No database or network access required.
"""
from __future__ import annotations

import pytest

from app.modules.chats.model import ChatStatus
from app.modules.chats.schemas import ChatCreate, ChatRead, ChatUpdate


_VALID_WS_ID = "12345678-1234-5678-1234-567812345678"


# ---------------------------------------------------------------------------
# ChatCreate
# ---------------------------------------------------------------------------

def test_chat_create_title_is_optional() -> None:
    c = ChatCreate(workspace_id=_VALID_WS_ID)
    assert c.title is None


def test_chat_create_accepts_title() -> None:
    c = ChatCreate(workspace_id=_VALID_WS_ID, title="My first chat")
    assert c.title == "My first chat"


def test_chat_create_requires_workspace_id() -> None:
    with pytest.raises(Exception):
        ChatCreate()  # type: ignore[call-arg]


def test_chat_create_rejects_invalid_workspace_uuid() -> None:
    with pytest.raises(Exception):
        ChatCreate(workspace_id="not-a-uuid")


def test_chat_create_rejects_empty_title() -> None:
    with pytest.raises(Exception):
        ChatCreate(workspace_id=_VALID_WS_ID, title="")


def test_chat_create_rejects_title_over_200_chars() -> None:
    with pytest.raises(Exception):
        ChatCreate(workspace_id=_VALID_WS_ID, title="A" * 201)


def test_chat_create_accepts_title_at_max_length() -> None:
    c = ChatCreate(workspace_id=_VALID_WS_ID, title="A" * 200)
    assert len(c.title) == 200  # type: ignore[arg-type]


# ---------------------------------------------------------------------------
# ChatUpdate
# ---------------------------------------------------------------------------

def test_chat_update_all_optional() -> None:
    u = ChatUpdate()
    assert u.title is None
    assert u.status is None


def test_chat_update_accepts_title_only() -> None:
    u = ChatUpdate(title="Renamed chat")
    assert u.title == "Renamed chat"


def test_chat_update_accepts_status_only() -> None:
    u = ChatUpdate(status=ChatStatus.ARCHIVED)
    assert u.status == ChatStatus.ARCHIVED


def test_chat_update_rejects_invalid_status() -> None:
    with pytest.raises(Exception):
        ChatUpdate(status="UNKNOWN_STATUS")  # type: ignore[arg-type]


def test_chat_update_rejects_empty_title() -> None:
    with pytest.raises(Exception):
        ChatUpdate(title="")


def test_chat_update_rejects_title_over_200_chars() -> None:
    with pytest.raises(Exception):
        ChatUpdate(title="X" * 201)


# ---------------------------------------------------------------------------
# ChatStatus enum values
# ---------------------------------------------------------------------------

def test_chat_status_active_value() -> None:
    assert ChatStatus.ACTIVE.value == "ACTIVE"


def test_chat_status_archived_value() -> None:
    assert ChatStatus.ARCHIVED.value == "ARCHIVED"


def test_chat_status_deleted_value() -> None:
    assert ChatStatus.DELETED.value == "DELETED"


def test_chat_status_is_string_enum() -> None:
    assert isinstance(ChatStatus.ACTIVE, str)
