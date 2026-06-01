from __future__ import annotations

from uuid import UUID

from sqlalchemy.orm import Session

from app.core.exceptions import ResourceNotFoundError
from app.modules.artifacts import repository as repo
from app.modules.artifacts.model import Artifact
from app.modules.artifacts.permissions import (
    require_artifact_manage_permission,
    require_artifact_read_access,
)
from app.modules.artifacts.repository import _UNSET
from app.modules.artifacts.schemas import ArtifactCreate, ArtifactUpdate
from app.modules.chats import repository as chat_repo
from app.modules.workspaces import permissions as ws_permissions


def create_artifact(
    db: Session,
    *,
    data: ArtifactCreate,
    user_id: UUID,
) -> Artifact:
    """Create a new artifact. Verifies workspace membership and optional chat ownership."""
    ws_permissions.require_workspace_member(
        db, user_id=user_id, workspace_id=data.workspace_id
    )

    if data.chat_id is not None:
        chat = chat_repo.get_chat_by_id(db, data.chat_id)
        if chat is None or chat.workspace_id != data.workspace_id:
            raise ResourceNotFoundError("Chat")

    obj = repo.create_artifact(
        db,
        workspace_id=data.workspace_id,
        chat_id=data.chat_id,
        created_by=user_id,
        title=data.title,
        type_value=data.type.value,
        content=data.content,
        metadata_json=data.metadata_json,
    )
    db.commit()
    db.refresh(obj)
    return obj


def list_artifacts(
    db: Session,
    *,
    workspace_id: UUID,
    user_id: UUID,
    chat_id: UUID | None = None,
    type_value: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[Artifact], int]:
    """Return (items, total) for the workspace, filtered by optional chat_id and type."""
    ws_permissions.require_workspace_member(
        db, user_id=user_id, workspace_id=workspace_id
    )
    items = repo.list_artifacts(
        db,
        workspace_id,
        chat_id=chat_id,
        type_value=type_value,
        limit=limit,
        offset=offset,
    )
    total = repo.count_artifacts(
        db,
        workspace_id,
        chat_id=chat_id,
        type_value=type_value,
    )
    return items, total


def get_artifact(
    db: Session,
    artifact_id: UUID,
    user_id: UUID,
) -> Artifact:
    """Fetch a single active artifact, verifying read access."""
    artifact = repo.get_artifact_by_id(db, artifact_id)
    if artifact is None or not artifact.is_active:
        raise ResourceNotFoundError("Artifact")
    require_artifact_read_access(db, artifact=artifact, user_id=user_id)
    return artifact


def update_artifact(
    db: Session,
    artifact_id: UUID,
    *,
    data: ArtifactUpdate,
    user_id: UUID,
) -> Artifact:
    """Update artifact fields. Increments version when content changes."""
    artifact = get_artifact(db, artifact_id, user_id)
    require_artifact_manage_permission(db, artifact=artifact, user_id=user_id)

    increment_version = data.content is not None

    # Use _UNSET sentinel so explicit None clears the field, while omitted
    # metadata_json leaves the existing value intact.
    metadata_json_arg = (
        data.metadata_json if data.metadata_json is not None else _UNSET
    )

    updated = repo.update_artifact(
        db,
        artifact,
        title=data.title,
        content=data.content,
        type_value=data.type.value if data.type is not None else None,
        metadata_json=metadata_json_arg,
        increment_version=increment_version,
    )
    db.commit()
    db.refresh(updated)
    return updated


def delete_artifact(
    db: Session,
    artifact_id: UUID,
    *,
    user_id: UUID,
) -> None:
    """Soft-delete an artifact by setting is_active=False."""
    artifact = get_artifact(db, artifact_id, user_id)
    require_artifact_manage_permission(db, artifact=artifact, user_id=user_id)
    repo.soft_delete_artifact(db, artifact)
    db.commit()
