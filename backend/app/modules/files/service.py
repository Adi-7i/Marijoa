from __future__ import annotations

import hashlib
import logging
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path
from uuid import UUID, uuid4

from fastapi import UploadFile
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.exceptions import AuthorizationError, ResourceNotFoundError
from app.modules.audit_logs import service as audit_service
from app.modules.audit_logs.model import AuditAction
from app.modules.files import permissions
from app.modules.files import repository as repo
from app.modules.files.exceptions import FileValidationError
from app.modules.files.model import File, FileStatus
from app.modules.workspaces import repository as ws_repo

logger = logging.getLogger(__name__)


def _sanitize_filename(filename: str) -> str:
    """Return a safe filename stripped of path components and unsafe characters."""
    name = Path(filename).name
    name = re.sub(r"[^\w\-.()\s]", "_", name)
    name = name.lstrip(".")
    return name[:200] if name else "file"


def _generate_blob_name(
    org_id: UUID, workspace_id: UUID, file_id: UUID, safe_filename: str
) -> str:
    """Construct a unique blob path that encodes the org/workspace/file hierarchy."""
    return (
        "organizations/"
        + str(org_id)
        + "/workspaces/"
        + str(workspace_id)
        + "/files/"
        + str(file_id)
        + "/"
        + safe_filename
    )


def _get_storage():
    """Lazily import and instantiate the Azure storage provider."""
    from app.modules.files.storage.azure_blob import AzureBlobStorageProvider

    return AzureBlobStorageProvider()


async def upload_file(
    db: Session,
    *,
    workspace_id: UUID,
    file: UploadFile,
    user_id: UUID,
) -> File:
    """Validate, upload to Azure Blob Storage, and persist file metadata."""
    settings = get_settings()

    # 1. Validate workspace access
    workspace = ws_repo.get_workspace_by_id(db, workspace_id)
    if not workspace or not workspace.is_active:
        raise ResourceNotFoundError("Workspace", workspace_id)

    member = ws_repo.get_workspace_member(db, workspace_id, user_id)
    if not member or member.status != "ACTIVE":
        raise AuthorizationError("No workspace access")
    if not permissions.can_upload_file(member.role):
        raise AuthorizationError("Viewer role cannot upload files")

    # 2. Validate filename
    if not file.filename:
        raise FileValidationError("No filename provided")

    # 3. Validate MIME type
    allowed_types = [t.strip() for t in settings.ALLOWED_UPLOAD_MIME_TYPES.split(",")]
    content_type = file.content_type or ""
    if content_type not in allowed_types:
        raise FileValidationError("File type not allowed: " + content_type)

    # 4. Read file bytes
    file_bytes = await file.read()

    # 5. Validate size
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if len(file_bytes) > max_bytes:
        raise FileValidationError(
            "File exceeds maximum size of " + str(settings.MAX_UPLOAD_SIZE_MB) + " MB"
        )

    # 6. Prepare metadata
    file_id = uuid4()
    safe_name = _sanitize_filename(file.filename)
    checksum = hashlib.sha256(file_bytes).hexdigest()
    org_id = workspace.organization_id
    blob_name = _generate_blob_name(org_id, workspace_id, file_id, safe_name)

    # 7. Upload to Azure
    storage = _get_storage()
    storage.upload_file(blob_name, file_bytes, content_type)

    # 8. Save metadata to DB
    file_obj = repo.create_file_record(
        db,
        workspace_id=workspace_id,
        uploaded_by=user_id,
        original_filename=file.filename,
        stored_filename=safe_name,
        mime_type=content_type,
        size_bytes=len(file_bytes),
        storage_provider="azure_blob",
        blob_container=settings.AZURE_STORAGE_CONTAINER_NAME,
        blob_name=blob_name,
        status=FileStatus.READY.value,
        checksum_sha256=checksum,
    )
    db.commit()
    db.refresh(file_obj)
    audit_service.record_event(
        db, action=AuditAction.FILE_UPLOADED, entity_type='file',
        entity_id=file_obj.id, user_id=user_id, workspace_id=workspace_id,
        metadata={'filename': file_obj.original_filename, 'size_bytes': file_obj.size_bytes, 'mime_type': file_obj.mime_type},
    )
    db.commit()  # commit audit log too

    # Enqueue placeholder processing job — non-blocking, fire-and-forget
    try:
        from app.workers.enqueue import enqueue_file_processing_task
        enqueue_file_processing_task(file_obj.id)
    except Exception:
        logger.warning("Failed to enqueue file processing task for file_id=%s", file_obj.id)

    return file_obj


def list_files(
    db: Session,
    *,
    workspace_id: UUID,
    user_id: UUID,
    status_filter: str | None = None,
    mime_type_filter: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[File], int]:
    """Return paginated files for a workspace, verifying user membership."""
    member = ws_repo.get_workspace_member(db, workspace_id, user_id)
    if not member or member.status != "ACTIVE":
        raise AuthorizationError("No workspace access")
    items = repo.list_files_by_workspace(
        db,
        workspace_id,
        status_filter=status_filter,
        mime_type_filter=mime_type_filter,
        limit=limit,
        offset=offset,
    )
    total = repo.count_files_by_workspace(
        db,
        workspace_id,
        status_filter=status_filter,
        mime_type_filter=mime_type_filter,
    )
    return items, total


def get_file(db: Session, file_id: UUID, user_id: UUID) -> File:
    """Retrieve a single file, checking workspace membership."""
    file_obj = repo.get_file_by_id(db, file_id)
    if not file_obj or not file_obj.is_active:
        raise ResourceNotFoundError("File", file_id)
    permissions.require_file_access(db, file_obj=file_obj, user_id=user_id)
    return file_obj


def delete_file(db: Session, file_id: UUID, *, user_id: UUID) -> None:
    """Soft-delete a file after verifying manage permission; attempt blob deletion."""
    file_obj = get_file(db, file_id, user_id)
    permissions.require_file_manage_permission(db, file_obj=file_obj, user_id=user_id)

    # Attempt to delete blob from Azure (non-blocking on failure)
    try:
        storage = _get_storage()
        storage.delete_file(file_obj.blob_name)
    except Exception:
        logger.warning(
            "Failed to delete blob %s from storage; proceeding with soft delete",
            file_obj.blob_name,
        )

    repo.soft_delete_file(db, file_obj)
    db.commit()
    audit_service.record_event(
        db, action=AuditAction.FILE_DELETED, entity_type='file',
        entity_id=file_id, user_id=user_id,
    )
    db.commit()


def generate_download_url(
    db: Session, file_id: UUID, *, user_id: UUID
) -> tuple[str, datetime]:
    """Generate a time-limited SAS download URL for the file."""
    file_obj = get_file(db, file_id, user_id)
    settings = get_settings()
    storage = _get_storage()
    url = storage.generate_download_url(
        file_obj.blob_name, settings.FILE_DOWNLOAD_SAS_EXPIRE_MINUTES
    )
    expires_at = datetime.now(timezone.utc) + timedelta(
        minutes=settings.FILE_DOWNLOAD_SAS_EXPIRE_MINUTES
    )
    return url, expires_at
