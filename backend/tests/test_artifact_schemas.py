"""Unit tests for Artifact Pydantic schemas.

No DB or network access required — pure Pydantic validation.
"""
from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.modules.artifacts.model import ArtifactType
from app.modules.artifacts.schemas import ArtifactCreate, ArtifactRead, ArtifactUpdate


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _valid_create(**overrides) -> dict:
    base = {
        "workspace_id": uuid4(),
        "title": "Test",
        "type": ArtifactType.DOCUMENT,
        "content": "Hello",
    }
    return {**base, **overrides}


def _now() -> datetime:
    return datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# ArtifactCreate — valid cases
# ---------------------------------------------------------------------------

def test_create_valid() -> None:
    artifact = ArtifactCreate(**_valid_create())
    assert artifact.title == "Test"
    assert artifact.type == ArtifactType.DOCUMENT


def test_create_chat_id_optional() -> None:
    artifact = ArtifactCreate(**_valid_create())
    assert artifact.chat_id is None


def test_create_all_types_valid() -> None:
    for artifact_type in ArtifactType:
        artifact = ArtifactCreate(**_valid_create(type=artifact_type))
        assert artifact.type == artifact_type


# ---------------------------------------------------------------------------
# ArtifactCreate — invalid cases
# ---------------------------------------------------------------------------

def test_create_empty_title_rejected() -> None:
    with pytest.raises(ValidationError):
        ArtifactCreate(**_valid_create(title=""))


def test_create_title_too_long_rejected() -> None:
    with pytest.raises(ValidationError):
        ArtifactCreate(**_valid_create(title="A" * 201))


def test_create_empty_content_rejected() -> None:
    with pytest.raises(ValidationError):
        ArtifactCreate(**_valid_create(content=""))


def test_create_invalid_type_rejected() -> None:
    with pytest.raises(ValidationError):
        ArtifactCreate(**_valid_create(type="invalid"))


# ---------------------------------------------------------------------------
# ArtifactUpdate
# ---------------------------------------------------------------------------

def test_update_all_optional() -> None:
    update = ArtifactUpdate()
    assert update.title is None
    assert update.content is None
    assert update.type is None
    assert update.metadata_json is None


def test_update_content_valid() -> None:
    update = ArtifactUpdate(content="new content")
    assert update.content == "new content"


# ---------------------------------------------------------------------------
# ArtifactType enum
# ---------------------------------------------------------------------------

def test_type_document_value() -> None:
    assert ArtifactType.DOCUMENT == "document"


def test_type_code_value() -> None:
    assert ArtifactType.CODE == "code"


def test_type_is_str_subclass() -> None:
    assert isinstance(ArtifactType.DOCUMENT, str)


# ---------------------------------------------------------------------------
# ArtifactRead
# ---------------------------------------------------------------------------

def test_artifact_read_from_dict() -> None:
    now = _now()
    data = {
        "id": uuid4(),
        "workspace_id": uuid4(),
        "chat_id": None,
        "created_by": uuid4(),
        "title": "My Artifact",
        "type": "document",
        "content": "Some content here",
        "version": 1,
        "is_active": True,
        "metadata_json": None,
        "created_at": now,
        "updated_at": now,
    }
    artifact_read = ArtifactRead.model_validate(data)
    assert artifact_read.title == "My Artifact"
    assert artifact_read.type == "document"
    assert artifact_read.version == 1
    assert artifact_read.is_active is True
