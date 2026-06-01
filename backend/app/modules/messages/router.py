from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.auth.dependencies import require_authenticated_user
from app.modules.messages import service
from app.modules.messages.schemas import MessageCreate, MessageRead, MessagesListResponse
from app.modules.users.model import User

router = APIRouter(prefix="/chats", tags=["messages"])


@router.get(
    "/{chat_id}/messages",
    response_model=MessagesListResponse,
    summary="List messages in a chat",
)
async def list_messages(
    chat_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_authenticated_user)],
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
) -> MessagesListResponse:
    msgs, total = service.list_messages(
        db, chat_id, current_user.id, limit=limit, offset=offset
    )
    return MessagesListResponse(
        items=[MessageRead.model_validate(m) for m in msgs],
        total=total,
    )


@router.post(
    "/{chat_id}/messages",
    response_model=MessageRead,
    status_code=201,
    summary="Post a user message to a chat",
)
async def create_message(
    chat_id: UUID,
    data: MessageCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_authenticated_user)],
) -> MessageRead:
    msg = service.save_user_message(
        db, chat_id=chat_id, content=data.content, user_id=current_user.id
    )
    return MessageRead.model_validate(msg)
