from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from pydantic import Field

from app.modules.messages.schemas import MessageRead
from app.modules.web_search.schemas import WebMode
from app.schemas.base import AppSchema


# ---------------------------------------------------------------------------
# Internal dataclasses — not serialised to JSON, used inside the gateway layer
# ---------------------------------------------------------------------------


@dataclass
class ProviderMessage:
    """A single message passed to the AI provider in conversation format."""

    role: str
    content: str


@dataclass
class AICompletionResult:
    """The structured result returned by an AI provider after generating a response."""

    content: str
    model: str
    provider: str
    usage: dict[str, Any] | None = field(default=None)
    latency_ms: float | None = field(default=None)


# ---------------------------------------------------------------------------
# HTTP request / response schemas
# ---------------------------------------------------------------------------


class AIRespondRequest(AppSchema):
    """Request body for triggering an AI response in a chat.

    ``web_mode`` controls whether the gateway should consult the live web
    search provider for this turn. Defaults to ``auto`` so existing callers
    do not need to pass it explicitly.
    """

    content: str = Field(min_length=1, max_length=20000)
    web_mode: WebMode = Field(default=WebMode.AUTO)


class AIRespondResponse(AppSchema):
    """Response returned after the AI gateway processes a user message.

    Both the persisted user message and the generated assistant message are
    included so the client can render the full exchange in a single round-trip.
    """

    user_message: MessageRead
    assistant_message: MessageRead
