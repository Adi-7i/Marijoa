from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.auth.dependencies import require_authenticated_user
from app.modules.chats import schemas, service
from app.modules.chats.model import ChatStatus
from app.modules.users.model import User
from app.utils.responses import success

router = APIRouter(prefix="/chats", tags=["chats"])


@router.post(
    "",
    response_model=schemas.ChatRead,
    status_code=201,
    summary="Create a new chat",
)
async def create_chat(
    data: schemas.ChatCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_authenticated_user)],
) -> schemas.ChatRead:
    chat = service.create_chat(db, data, user_id=current_user.id)
    return schemas.ChatRead.model_validate(chat)


@router.get(
    "",
    response_model=list[schemas.ChatRead],
    summary="List chats in a workspace",
)
async def list_chats(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_authenticated_user)],
    workspace_id: UUID = Query(..., description="Workspace to list chats for"),
    status: ChatStatus | None = Query(
        default=None,
        description="Filter by status. DELETED chats excluded by default.",
    ),
) -> list[schemas.ChatRead]:
    chats = service.list_chats(db, workspace_id, current_user.id, status=status)
    return [schemas.ChatRead.model_validate(c) for c in chats]


@router.get(
    "/{chat_id}",
    response_model=schemas.ChatRead,
    summary="Get chat details",
)
async def get_chat(
    chat_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_authenticated_user)],
) -> schemas.ChatRead:
    chat = service.get_chat(db, chat_id, current_user.id)
    return schemas.ChatRead.model_validate(chat)


@router.patch(
    "/{chat_id}",
    response_model=schemas.ChatRead,
    summary="Rename or change status of a chat",
)
async def update_chat(
    chat_id: UUID,
    data: schemas.ChatUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_authenticated_user)],
) -> schemas.ChatRead:
    chat = service.update_chat(db, chat_id, data, current_user.id)
    return schemas.ChatRead.model_validate(chat)


@router.delete(
    "/{chat_id}",
    summary="Soft-delete a chat (sets status to DELETED)",
)
async def delete_chat(
    chat_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_authenticated_user)],
) -> dict:
    service.delete_chat(db, chat_id, current_user.id)
    return success(message="Chat deleted")
