from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import ConfigDict

from app.schemas.base import AppSchema


class AuditLogRead(AppSchema):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    organization_id: UUID | None
    workspace_id: UUID | None
    user_id: UUID | None
    action: str
    entity_type: str
    entity_id: UUID | None
    ip_address: str | None
    user_agent: str | None
    metadata_json: dict | None
    created_at: datetime
