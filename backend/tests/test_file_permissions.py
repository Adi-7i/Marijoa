"""Unit tests for file permission helper functions.

No database or external calls are made; workspace_repo is not hit because
we call the pure helpers (can_upload_file, can_manage_file) directly.
"""
from __future__ import annotations

from unittest.mock import MagicMock
from uuid import uuid4

import pytest

from app.modules.files.permissions import can_manage_file, can_upload_file
from app.modules.workspaces.model import WorkspaceRole


# ---------------------------------------------------------------------------
# can_upload_file
# ---------------------------------------------------------------------------


def test_viewer_cannot_upload() -> None:
    assert can_upload_file(WorkspaceRole.VIEWER) is False


def test_member_can_upload() -> None:
    assert can_upload_file(WorkspaceRole.MEMBER) is True


def test_manager_can_upload() -> None:
    assert can_upload_file(WorkspaceRole.MANAGER) is True


def test_admin_can_upload() -> None:
    assert can_upload_file(WorkspaceRole.ADMIN) is True


def test_owner_can_upload() -> None:
    assert can_upload_file(WorkspaceRole.OWNER) is True


def test_invalid_role_cannot_upload() -> None:
    assert can_upload_file("UNKNOWN_ROLE") is False


# ---------------------------------------------------------------------------
# can_manage_file
# ---------------------------------------------------------------------------


def _make_file_obj(uploaded_by: str) -> MagicMock:
    """Build a minimal file-like object with an uploaded_by attribute."""
    file_obj = MagicMock()
    file_obj.uploaded_by = uploaded_by
    return file_obj


def test_uploader_can_manage_own_file() -> None:
    user_id = uuid4()
    file_obj = _make_file_obj(str(user_id))

    assert can_manage_file(file_obj, user_id=user_id, workspace_role=WorkspaceRole.MEMBER) is True


def test_manager_can_manage_others_file() -> None:
    uploader_id = uuid4()
    manager_id = uuid4()
    file_obj = _make_file_obj(str(uploader_id))

    assert can_manage_file(file_obj, user_id=manager_id, workspace_role=WorkspaceRole.MANAGER) is True


def test_owner_can_manage_any_file() -> None:
    uploader_id = uuid4()
    owner_id = uuid4()
    file_obj = _make_file_obj(str(uploader_id))

    assert can_manage_file(file_obj, user_id=owner_id, workspace_role=WorkspaceRole.OWNER) is True


def test_admin_can_manage_others_file() -> None:
    uploader_id = uuid4()
    admin_id = uuid4()
    file_obj = _make_file_obj(str(uploader_id))

    assert can_manage_file(file_obj, user_id=admin_id, workspace_role=WorkspaceRole.ADMIN) is True


def test_member_cannot_manage_others_file() -> None:
    uploader_id = uuid4()
    other_user_id = uuid4()
    file_obj = _make_file_obj(str(uploader_id))

    assert can_manage_file(file_obj, user_id=other_user_id, workspace_role=WorkspaceRole.MEMBER) is False


def test_viewer_cannot_manage_others_file() -> None:
    uploader_id = uuid4()
    viewer_id = uuid4()
    file_obj = _make_file_obj(str(uploader_id))

    assert can_manage_file(file_obj, user_id=viewer_id, workspace_role=WorkspaceRole.VIEWER) is False


def test_invalid_role_cannot_manage_others_file() -> None:
    uploader_id = uuid4()
    other_id = uuid4()
    file_obj = _make_file_obj(str(uploader_id))

    assert can_manage_file(file_obj, user_id=other_id, workspace_role="UNKNOWN") is False
