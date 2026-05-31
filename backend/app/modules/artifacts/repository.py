from __future__ import annotations

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.modules.artifacts.model import Artifact

# Sentinel object to distinguish "not provided" from explicit None
_UNSET = object()


def create_artifact(
    db: Session,
    *,
    workspace_id: UUID,
    chat_id: UUID | None,
    created_by: UUID,
    title: str,
    type_value: str,
    content: str,
    metadata_json: dict | None = None,
) -> Artifact:
    obj = Artifact(
        workspace_id=workspace_id,
        chat_id=chat_id,
        created_by=created_by,
        title=title,
        type=type_value,
        content=content,
        metadata_json=metadata_json,
    )
    db.add(obj)
    db.flush()
    db.refresh(obj)
    return obj


def get_artifact_by_id(db: Session, artifact_id: UUID) -> Artifact | None:
    return db.scalars(select(Artifact).where(Artifact.id == artifact_id)).first()


def list_artifacts(
    db: Session,
    workspace_id: UUID,
    *,
    chat_id: UUID | None = None,
    type_value: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> list[Artifact]:
    stmt = select(Artifact).where(
        Artifact.workspace_id == workspace_id,
        Artifact.is_active.is_(True),
    )
    if chat_id is not None:
        stmt = stmt.where(Artifact.chat_id == chat_id)
    if type_value is not None:
        stmt = stmt.where(Artifact.type == type_value)
    stmt = stmt.order_by(Artifact.created_at.desc()).limit(limit).offset(offset)
    return list(db.scalars(stmt).all())


def count_artifacts(
    db: Session,
    workspace_id: UUID,
    *,
    chat_id: UUID | None = None,
    type_value: str | None = None,
) -> int:
    stmt = (
        select(func.count())
        .select_from(Artifact)
        .where(
            Artifact.workspace_id == workspace_id,
            Artifact.is_active.is_(True),
        )
    )
    if chat_id is not None:
        stmt = stmt.where(Artifact.chat_id == chat_id)
    if type_value is not None:
        stmt = stmt.where(Artifact.type == type_value)
    return db.scalar(stmt) or 0


def update_artifact(
    db: Session,
    artifact: Artifact,
    *,
    title: str | None = None,
    content: str | None = None,
    type_value: str | None = None,
    metadata_json: object = _UNSET,
    increment_version: bool = False,
) -> Artifact:
    if title is not None:
        artifact.title = title
    if content is not None:
        artifact.content = content
    if type_value is not None:
        artifact.type = type_value
    if metadata_json is not _UNSET:
        artifact.metadata_json = metadata_json  # type: ignore[assignment]
    if increment_version:
        artifact.version += 1
    db.flush()
    db.refresh(artifact)
    return artifact


def soft_delete_artifact(db: Session, artifact: Artifact) -> Artifact:
    artifact.is_active = False
    db.flush()
    db.refresh(artifact)
    return artifact
