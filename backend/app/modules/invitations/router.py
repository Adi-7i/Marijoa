from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.auth.dependencies import require_authenticated_user
from app.modules.invitations import schemas, service
from app.modules.users.model import User


# ---------------------------------------------------------------------------
# Admin-facing routes — mounted under /organizations/{organization_id}/invitations
# ---------------------------------------------------------------------------

admin_router = APIRouter(
    prefix="/organizations/{organization_id}/invitations",
    tags=["invitations"],
)


@admin_router.post(
    "",
    response_model=schemas.InvitationCreateResponse,
    status_code=201,
    summary="Create a new organization invitation",
)
async def create_invitation(
    organization_id: UUID,
    data: schemas.InvitationCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_authenticated_user)],
) -> schemas.InvitationCreateResponse:
    return service.create_invitation(
        db,
        organization_id=organization_id,
        data=data,
        acting_user_id=current_user.id,
    )


@admin_router.get(
    "",
    response_model=list[schemas.InvitationRead],
    summary="List invitations for the organization",
)
async def list_invitations(
    organization_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_authenticated_user)],
    status: str | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
) -> list[schemas.InvitationRead]:
    return service.list_invitations(
        db,
        organization_id=organization_id,
        acting_user_id=current_user.id,
        status=status,
        limit=limit,
        offset=offset,
    )


@admin_router.post(
    "/{invitation_id}/approve",
    response_model=schemas.InvitationRead,
    summary="Approve an invitation that is awaiting approval",
)
async def approve_invitation(
    organization_id: UUID,
    invitation_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_authenticated_user)],
) -> schemas.InvitationRead:
    return service.approve_invitation(
        db,
        organization_id=organization_id,
        invitation_id=invitation_id,
        acting_user_id=current_user.id,
    )


@admin_router.post(
    "/{invitation_id}/reject",
    response_model=schemas.InvitationRead,
    summary="Reject an invitation that is awaiting approval",
)
async def reject_invitation(
    organization_id: UUID,
    invitation_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_authenticated_user)],
) -> schemas.InvitationRead:
    return service.reject_invitation(
        db,
        organization_id=organization_id,
        invitation_id=invitation_id,
        acting_user_id=current_user.id,
    )


@admin_router.post(
    "/{invitation_id}/cancel",
    response_model=schemas.InvitationRead,
    summary="Cancel an invitation that is still awaiting signup",
)
async def cancel_invitation(
    organization_id: UUID,
    invitation_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_authenticated_user)],
) -> schemas.InvitationRead:
    return service.cancel_invitation(
        db,
        organization_id=organization_id,
        invitation_id=invitation_id,
        acting_user_id=current_user.id,
    )


# ---------------------------------------------------------------------------
# Public routes — mounted under /invitations
# ---------------------------------------------------------------------------

public_router = APIRouter(prefix="/invitations", tags=["invitations"])


@public_router.get(
    "/validate/{token}",
    response_model=schemas.InvitationValidateResponse,
    summary="Validate an invite token and return safe metadata",
)
async def validate_invitation(
    token: str,
    db: Annotated[Session, Depends(get_db)],
) -> schemas.InvitationValidateResponse:
    return service.validate_invitation(db, token)


@public_router.post(
    "/accept",
    response_model=schemas.InvitationAcceptResponse,
    summary="Accept an invitation as a new user",
)
async def accept_invitation(
    data: schemas.InvitationAcceptRequest,
    db: Annotated[Session, Depends(get_db)],
) -> schemas.InvitationAcceptResponse:
    return service.accept_invitation(db, data)


@public_router.post(
    "/accept-existing",
    response_model=schemas.InvitationAcceptResponse,
    summary="Accept an invitation as an authenticated existing user",
)
async def accept_invitation_existing(
    data: schemas.InvitationAcceptExistingRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_authenticated_user)],
) -> schemas.InvitationAcceptResponse:
    return service.accept_invitation_existing_user(
        db, raw_token=data.token, current_user=current_user
    )
