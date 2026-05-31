"""Unit tests for Artifact service layer.

All DB and repository calls are mocked — no database or network access needed.
"""
from __future__ import annotations

from unittest.mock import MagicMock, patch
from uuid import uuid4

import pytest

from app.core.exceptions import ResourceNotFoundError
from app.modules.artifacts.model import ArtifactType
from app.modules.artifacts.schemas import ArtifactUpdate
from app.modules.artifacts import service


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _mock_db() -> MagicMock:
    db = MagicMock()
    db.commit.return_value = None
    db.refresh.return_value = None
    return db


def _mock_artifact(is_active: bool = True) -> MagicMock:
    artifact = MagicMock()
    artifact.is_active = is_active
    artifact.workspace_id = uuid4()
    artifact.created_by = uuid4()
    return artifact


# ---------------------------------------------------------------------------
# get_artifact — not found
# ---------------------------------------------------------------------------

def test_get_artifact_not_found_raises_resource_not_found() -> None:
    db = _mock_db()

    with patch("app.modules.artifacts.service.repo") as mock_repo:
        mock_repo.get_artifact_by_id.return_value = None

        with pytest.raises(ResourceNotFoundError):
            service.get_artifact(db, uuid4(), uuid4())


# ---------------------------------------------------------------------------
# update_artifact — version increment when content changes
# ---------------------------------------------------------------------------

def test_update_increments_version_when_content_provided() -> None:
    db = _mock_db()
    artifact = _mock_artifact()
    updated_artifact = _mock_artifact()

    with (
        patch("app.modules.artifacts.service.repo") as mock_repo,
        patch(
            "app.modules.artifacts.service.require_artifact_manage_permission"
        ) as mock_manage_perm,
    ):
        # get_artifact calls repo.get_artifact_by_id then require_artifact_read_access
        mock_repo.get_artifact_by_id.return_value = artifact
        mock_repo.update_artifact.return_value = updated_artifact

        # Suppress read access check (workspace membership) inside get_artifact
        with patch(
            "app.modules.artifacts.service.require_artifact_read_access"
        ):
            data = ArtifactUpdate(content="new content")
            service.update_artifact(db, uuid4(), data=data, user_id=uuid4())

        # Verify increment_version=True was passed
        _, kwargs = mock_repo.update_artifact.call_args
        assert kwargs["increment_version"] is True


# ---------------------------------------------------------------------------
# update_artifact — no version bump for title-only update
# ---------------------------------------------------------------------------

def test_update_no_version_bump_for_title_only() -> None:
    db = _mock_db()
    artifact = _mock_artifact()
    updated_artifact = _mock_artifact()

    with (
        patch("app.modules.artifacts.service.repo") as mock_repo,
        patch(
            "app.modules.artifacts.service.require_artifact_manage_permission"
        ),
    ):
        mock_repo.get_artifact_by_id.return_value = artifact
        mock_repo.update_artifact.return_value = updated_artifact

        with patch(
            "app.modules.artifacts.service.require_artifact_read_access"
        ):
            data = ArtifactUpdate(title="New Title")
            service.update_artifact(db, uuid4(), data=data, user_id=uuid4())

        _, kwargs = mock_repo.update_artifact.call_args
        assert kwargs["increment_version"] is False


# ---------------------------------------------------------------------------
# delete_artifact — calls soft_delete_artifact
# ---------------------------------------------------------------------------

def test_delete_calls_soft_delete() -> None:
    db = _mock_db()
    artifact = _mock_artifact()

    with (
        patch("app.modules.artifacts.service.repo") as mock_repo,
        patch(
            "app.modules.artifacts.service.require_artifact_manage_permission"
        ),
    ):
        mock_repo.get_artifact_by_id.return_value = artifact
        mock_repo.soft_delete_artifact.return_value = artifact

        with patch(
            "app.modules.artifacts.service.require_artifact_read_access"
        ):
            service.delete_artifact(db, uuid4(), user_id=uuid4())

        mock_repo.soft_delete_artifact.assert_called_once_with(db, artifact)
