"""Unit tests for Artifact permission helpers.

No DB access required — uses MagicMock objects.
"""
from __future__ import annotations

from unittest.mock import MagicMock
from uuid import uuid4

from app.modules.artifacts.permissions import can_manage_artifact
from app.modules.workspaces.model import WorkspaceRole


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_artifact(created_by=None) -> MagicMock:
    artifact = MagicMock()
    artifact.created_by = created_by or uuid4()
    return artifact


# ---------------------------------------------------------------------------
# Creator can always manage their own artifact
# ---------------------------------------------------------------------------

def test_creator_can_manage_as_member() -> None:
    user_id = uuid4()
    artifact = _make_artifact(created_by=user_id)
    result = can_manage_artifact(
        artifact,
        user_id=user_id,
        workspace_role=WorkspaceRole.MEMBER.value,
    )
    assert result is True


# ---------------------------------------------------------------------------
# Privileged roles can manage anyone's artifact
# ---------------------------------------------------------------------------

def test_manager_can_manage_others_artifact() -> None:
    artifact = _make_artifact()  # different creator
    result = can_manage_artifact(
        artifact,
        user_id=uuid4(),
        workspace_role=WorkspaceRole.MANAGER.value,
    )
    assert result is True


def test_owner_can_manage_others_artifact() -> None:
    artifact = _make_artifact()
    result = can_manage_artifact(
        artifact,
        user_id=uuid4(),
        workspace_role=WorkspaceRole.OWNER.value,
    )
    assert result is True


def test_admin_can_manage_others_artifact() -> None:
    artifact = _make_artifact()
    result = can_manage_artifact(
        artifact,
        user_id=uuid4(),
        workspace_role=WorkspaceRole.ADMIN.value,
    )
    assert result is True


# ---------------------------------------------------------------------------
# Unprivileged roles cannot manage someone else's artifact
# ---------------------------------------------------------------------------

def test_viewer_cannot_manage_others_artifact() -> None:
    artifact = _make_artifact()  # created_by != user_id
    result = can_manage_artifact(
        artifact,
        user_id=uuid4(),
        workspace_role=WorkspaceRole.VIEWER.value,
    )
    assert result is False


def test_member_cannot_manage_others_artifact() -> None:
    artifact = _make_artifact()  # created_by != user_id
    result = can_manage_artifact(
        artifact,
        user_id=uuid4(),
        workspace_role=WorkspaceRole.MEMBER.value,
    )
    assert result is False
