from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import ConfigDict

from app.schemas.base import AppSchema


class FileRead(AppSchema):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    workspace_id: UUID
    uploaded_by: UUID
    original_filename: str
    stored_filename: str
    mime_type: str
    size_bytes: int
    storage_provider: str
    blob_container: str
    status: str
    checksum_sha256: str | None
    metadata_json: dict | None
    is_active: bool
    created_at: datetime
    updated_at: datetime


class FileDownloadUrlResponse(AppSchema):
    download_url: str
    expires_at: datetime


class FileListResponse(AppSchema):
    items: list[FileRead]
    total: int
