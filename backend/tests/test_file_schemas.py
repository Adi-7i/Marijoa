"""Unit tests for File schemas and FileStatus enum.

No database or external calls are made; all tests operate on plain Python
objects and Pydantic models.
"""
from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

import pytest

from app.modules.files.model import FileStatus
from app.modules.files.schemas import FileDownloadUrlResponse, FileListResponse, FileRead


# ---------------------------------------------------------------------------
# FileStatus enum
# ---------------------------------------------------------------------------


def test_file_status_ready_value() -> None:
    assert FileStatus.READY == "READY"


def test_file_status_deleted_value() -> None:
    assert FileStatus.DELETED == "DELETED"


def test_file_status_is_str() -> None:
    assert isinstance(FileStatus.READY, str)


def test_all_statuses_exist() -> None:
    assert hasattr(FileStatus, "UPLOADED")
    assert hasattr(FileStatus, "PROCESSING")
    assert hasattr(FileStatus, "READY")
    assert hasattr(FileStatus, "FAILED")
    assert hasattr(FileStatus, "DELETED")


# ---------------------------------------------------------------------------
# FileRead schema
# ---------------------------------------------------------------------------


def _file_read_dict() -> dict:
    now = datetime.now(timezone.utc)
    return {
        "id": uuid4(),
        "workspace_id": uuid4(),
        "uploaded_by": uuid4(),
        "original_filename": "report.pdf",
        "stored_filename": "report.pdf",
        "mime_type": "application/pdf",
        "size_bytes": 1024,
        "storage_provider": "azure_blob",
        "blob_container": "files",
        "status": FileStatus.READY.value,
        "checksum_sha256": "abc123",
        "metadata_json": None,
        "is_active": True,
        "created_at": now,
        "updated_at": now,
    }


def test_file_read_from_dict() -> None:
    data = _file_read_dict()
    obj = FileRead.model_validate(data)
    assert str(obj.original_filename) == "report.pdf"
    assert obj.is_active is True
    assert obj.size_bytes == 1024


# ---------------------------------------------------------------------------
# FileListResponse schema
# ---------------------------------------------------------------------------


def test_file_list_response_structure() -> None:
    resp = FileListResponse(items=[], total=0)
    assert resp.items == []
    assert resp.total == 0


def test_file_list_response_with_items() -> None:
    item = FileRead.model_validate(_file_read_dict())
    resp = FileListResponse(items=[item], total=1)
    assert len(resp.items) == 1
    assert resp.total == 1


# ---------------------------------------------------------------------------
# FileDownloadUrlResponse schema
# ---------------------------------------------------------------------------


def test_download_url_response() -> None:
    expires = datetime.now(timezone.utc)
    resp = FileDownloadUrlResponse(
        download_url="https://example.blob.core.windows.net/files/blob?sas=token",
        expires_at=expires,
    )
    assert resp.download_url.startswith("https://")
    assert resp.expires_at == expires
