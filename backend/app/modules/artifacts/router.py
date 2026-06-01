from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.artifacts import service
from app.modules.artifacts.schemas import (
    ArtifactCreate,
    ArtifactListResponse,
    ArtifactRead,
    ArtifactUpdate,
)
from app.modules.auth.dependencies import require_authenticated_user
from app.modules.users.model import User

router = APIRouter(prefix="/artifacts", tags=["artifacts"])


@router.post("", response_model=ArtifactRead, status_code=201)
async def create_artifact(
    body: ArtifactCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_authenticated_user)],
) -> ArtifactRead:
    obj = service.create_artifact(db, data=body, user_id=current_user.id)
    return ArtifactRead.model_validate(obj)


@router.get("", response_model=ArtifactListResponse)
async def list_artifacts(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_authenticated_user)],
    workspace_id: UUID = Query(...),
    chat_id: UUID | None = Query(None),
    type: str | None = Query(None),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
) -> ArtifactListResponse:
    items, total = service.list_artifacts(
        db,
        workspace_id=workspace_id,
        user_id=current_user.id,
        chat_id=chat_id,
        type_value=type,
        limit=limit,
        offset=offset,
    )
    return ArtifactListResponse(
        items=[ArtifactRead.model_validate(i) for i in items],
        total=total,
    )


@router.get("/{artifact_id}", response_model=ArtifactRead)
async def get_artifact(
    artifact_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_authenticated_user)],
) -> ArtifactRead:
    return ArtifactRead.model_validate(
        service.get_artifact(db, artifact_id, current_user.id)
    )


@router.patch("/{artifact_id}", response_model=ArtifactRead)
async def update_artifact(
    artifact_id: UUID,
    body: ArtifactUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_authenticated_user)],
) -> ArtifactRead:
    return ArtifactRead.model_validate(
        service.update_artifact(db, artifact_id, data=body, user_id=current_user.id)
    )


@router.delete("/{artifact_id}")
async def delete_artifact(
    artifact_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_authenticated_user)],
) -> dict:
    service.delete_artifact(db, artifact_id, user_id=current_user.id)
    return {"success": True}
