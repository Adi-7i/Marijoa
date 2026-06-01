from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.ai_gateway import service
from app.modules.ai_gateway.schemas import AIRespondRequest, AIRespondResponse
from app.modules.ai_gateway.service import ai_stream
from app.modules.auth.dependencies import require_authenticated_user
from app.modules.users.model import User

router = APIRouter(prefix="/chats", tags=["ai-gateway"])


@router.post(
    "/{chat_id}/ai/respond",
    response_model=AIRespondResponse,
    status_code=200,
    summary="Send a message and receive an AI-generated reply",
    description=(
        "Persists the user message, calls the configured AI provider, "
        "and returns both the user message and the generated assistant message. "
        "The workspace system instruction (if set) is automatically prepended "
        "to the provider context."
    ),
)
async def ai_respond(
    chat_id: UUID,
    data: AIRespondRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_authenticated_user)],
) -> AIRespondResponse:
    return service.ai_respond(
        db,
        chat_id=chat_id,
        content=data.content,
        user_id=current_user.id,
    )


@router.post(
    "/{chat_id}/ai/stream",
    summary="Send a message and stream an AI-generated reply as SSE",
    description=(
        "Persists the user message, then streams the AI assistant reply as "
        "Server-Sent Events. Events: start (user_message_id), token (content chunk), "
        "done (message_id), error (code + message). "
        "The workspace system instruction (if set) is automatically prepended "
        "to the provider context."
    ),
)
async def stream_ai_response(
    chat_id: UUID,
    body: AIRespondRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_authenticated_user)],
) -> StreamingResponse:
    gen = ai_stream(db, chat_id=chat_id, content=body.content, user_id=current_user.id)
    return StreamingResponse(
        gen,
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
