from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.auth.dependencies import require_authenticated_user
from app.modules.personal import service
from app.modules.personal.schemas import PersonalContextResponse
from app.modules.users.model import User

router = APIRouter(prefix="/me", tags=["personal"])


@router.get(
    "/personal-context",
    response_model=PersonalContextResponse,
    summary="Get personal workspace context",
    description=(
        "Returns the current user's personal organization and default workspace. "
        "Creates them automatically if missing (safe for legacy users created before "
        "personal mode was introduced). "
        "The frontend can use personal_workspace.id to start an AI chat immediately "
        "without requiring the user to create an organization first."
    ),
)
async def get_personal_context(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_authenticated_user)],
) -> PersonalContextResponse:
    return service.get_personal_context(db, current_user)
