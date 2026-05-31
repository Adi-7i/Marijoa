from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import Field

from app.modules.messages.model import MessageRole
from app.schemas.base import AppSchema


class MessageCreate(AppSchema):
    """Request body for a user-authored message posted to a chat."""

    content: str = Field(min_length=1, max_length=20000)


class InternalMessageCreate(AppSchema):
    """Internal schema used by the AI Gateway / service layer to persist any role.

    Not exposed as a public HTTP request body — constructed programmatically.
    """

    chat_id: UUID
    user_id: UUID | None
    role: MessageRole
    content: str
    model: str | None = None
    metadata_json: dict | None = None


class MessageRead(AppSchema):
    """Serialized view of a persisted message returned to the API consumer."""

    id: UUID
    chat_id: UUID
    user_id: UUID | None
    role: MessageRole
    content: str
    model: str | None
    metadata_json: dict | None
    created_at: datetime
    updated_at: datetime


class MessagesListResponse(AppSchema):
    """Paginated list of messages for a chat."""

    items: list[MessageRead]
    total: int
