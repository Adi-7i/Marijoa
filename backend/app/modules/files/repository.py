from __future__ import annotations

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.modules.files.model import File, FileStatus


def create_file_record(
    db: Session,
    *,
    workspace_id: UUID,
    uploaded_by: UUID,
    original_filename: str,
    stored_filename: str,
    mime_type: str,
    size_bytes: int,
    storage_provider: str,
    blob_container: str,
    blob_name: str,
    status: str,
    checksum_sha256: str | None = None,
    metadata_json: dict | None = None,
) -> File:
    file_obj = File(
        workspace_id=workspace_id,
        uploaded_by=uploaded_by,
        original_filename=original_filename,
        stored_filename=stored_filename,
        mime_type=mime_type,
        size_bytes=size_bytes,
        storage_provider=storage_provider,
        blob_container=blob_container,
        blob_name=blob_name,
        status=status,
        checksum_sha256=checksum_sha256,
        metadata_json=metadata_json,
    )
    db.add(file_obj)
    db.flush()
    return file_obj


def get_file_by_id(db: Session, file_id: UUID) -> File | None:
    return db.get(File, file_id)


def list_files_by_workspace(
    db: Session,
    workspace_id: UUID,
    *,
    status_filter: str | None = None,
    mime_type_filter: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> list[File]:
    stmt = (
        select(File)
        .where(File.workspace_id == workspace_id)
        .where(File.is_active.is_(True))
    )
    if status_filter is not None:
        stmt = stmt.where(File.status == status_filter)
    else:
        stmt = stmt.where(File.status != FileStatus.DELETED.value)
    if mime_type_filter is not None:
        stmt = stmt.where(File.mime_type == mime_type_filter)
    stmt = stmt.order_by(File.created_at.desc()).limit(limit).offset(offset)
    return list(db.scalars(stmt).all())


def count_files_by_workspace(
    db: Session,
    workspace_id: UUID,
    *,
    status_filter: str | None = None,
    mime_type_filter: str | None = None,
) -> int:
    stmt = (
        select(func.count())
        .select_from(File)
        .where(File.workspace_id == workspace_id)
        .where(File.is_active.is_(True))
    )
    if status_filter is not None:
        stmt = stmt.where(File.status == status_filter)
    else:
        stmt = stmt.where(File.status != FileStatus.DELETED.value)
    if mime_type_filter is not None:
        stmt = stmt.where(File.mime_type == mime_type_filter)
    result = db.scalar(stmt)
    return result or 0


def update_file_status(db: Session, file_obj: File, *, status: str) -> File:
    file_obj.status = status
    db.flush()
    db.refresh(file_obj)
    return file_obj


def soft_delete_file(db: Session, file_obj: File) -> File:
    file_obj.is_active = False
    file_obj.status = FileStatus.DELETED.value
    db.flush()
    db.refresh(file_obj)
    return file_obj
