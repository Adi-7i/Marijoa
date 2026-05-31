from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import Field

from app.modules.chats.model import ChatStatus
from app.schemas.base import AppSchema


class ChatCreate(AppSchema):
    workspace_id: UUID
    title: str | None = Field(
        default=None,
        min_length=1,
        max_length=200,
        description="Chat title. Defaults to 'New Chat' if omitted.",
    )


class ChatUpdate(AppSchema):
    """All fields are optional; at least one should be supplied."""

    title: str | None = Field(default=None, min_length=1, max_length=200)
    status: ChatStatus | None = None


class ChatRead(AppSchema):
    id: UUID
    workspace_id: UUID
    user_id: UUID
    title: str
    status: ChatStatus
    last_message_at: datetime | None
    created_at: datetime
    updated_at: datetime
