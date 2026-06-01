"""Unit tests for chat permission helpers.

No database or network access required.
The pure-logic helpers (can_manage_chat) are tested without a DB session.
"""
from __future__ import annotations

from uuid import UUID, uuid4

import pytest

from app.modules.chats.permissions import can_manage_chat
from app.modules.workspaces.model import WorkspaceRole


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_chat(user_id: UUID):  # type: ignore[no-untyped-def]
    """Return a minimal object that satisfies can_manage_chat's duck-typing."""
    class _FakeChat:
        workspace_id = uuid4()
        def __init__(self, uid: UUID) -> None:
            self.user_id = uid
    return _FakeChat(user_id)


# ---------------------------------------------------------------------------
# can_manage_chat
# ---------------------------------------------------------------------------

def test_chat_creator_can_manage_as_viewer() -> None:
    uid = uuid4()
    chat = _make_chat(uid)
    assert can_manage_chat(chat, uid, WorkspaceRole.VIEWER) is True


def test_chat_creator_can_manage_as_member() -> None:
    uid = uuid4()
    chat = _make_chat(uid)
    assert can_manage_chat(chat, uid, WorkspaceRole.MEMBER) is True


def test_workspace_manager_can_manage_others_chat() -> None:
    creator_id = uuid4()
    other_user = uuid4()
    chat = _make_chat(creator_id)
    assert can_manage_chat(chat, other_user, WorkspaceRole.MANAGER) is True


def test_workspace_admin_can_manage_others_chat() -> None:
    creator_id = uuid4()
    other_user = uuid4()
    chat = _make_chat(creator_id)
    assert can_manage_chat(chat, other_user, WorkspaceRole.ADMIN) is True


def test_workspace_owner_can_manage_others_chat() -> None:
    creator_id = uuid4()
    other_user = uuid4()
    chat = _make_chat(creator_id)
    assert can_manage_chat(chat, other_user, WorkspaceRole.OWNER) is True


def test_non_creator_member_cannot_manage() -> None:
    creator_id = uuid4()
    other_user = uuid4()
    chat = _make_chat(creator_id)
    assert can_manage_chat(chat, other_user, WorkspaceRole.MEMBER) is False


def test_non_creator_viewer_cannot_manage() -> None:
    creator_id = uuid4()
    other_user = uuid4()
    chat = _make_chat(creator_id)
    assert can_manage_chat(chat, other_user, WorkspaceRole.VIEWER) is False


def test_creator_is_identified_by_user_id_equality() -> None:
    uid = uuid4()
    other = uuid4()
    chat = _make_chat(uid)
    assert can_manage_chat(chat, uid, WorkspaceRole.VIEWER) is True
    assert can_manage_chat(chat, other, WorkspaceRole.VIEWER) is False
