from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import ConfigDict, Field

from app.modules.artifacts.model import ArtifactType
from app.schemas.base import AppSchema


class ArtifactCreate(AppSchema):
    workspace_id: UUID
    chat_id: UUID | None = None
    title: str = Field(..., min_length=1, max_length=200)
    type: ArtifactType
    content: str = Field(..., min_length=1, max_length=200000)
    metadata_json: dict | None = None


class ArtifactUpdate(AppSchema):
    title: str | None = Field(None, min_length=1, max_length=200)
    content: str | None = Field(None, min_length=1, max_length=200000)
    type: ArtifactType | None = None
    metadata_json: dict | None = None


class ArtifactRead(AppSchema):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    workspace_id: UUID
    chat_id: UUID | None
    created_by: UUID
    title: str
    type: str
    content: str
    version: int
    is_active: bool
    metadata_json: dict | None
    created_at: datetime
    updated_at: datetime


class ArtifactListResponse(AppSchema):
    items: list[ArtifactRead]
    total: int
