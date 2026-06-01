from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.auth.dependencies import require_authenticated_user
from app.modules.organizations import schemas, service
from app.modules.users.model import User

router = APIRouter(prefix="/organizations", tags=["organizations"])

# ---------------------------------------------------------------------------
# Note: /me must be declared before /{org_id} to avoid FastAPI treating
# the literal "me" as a UUID path parameter.
# ---------------------------------------------------------------------------


@router.post(
    "",
    response_model=schemas.OrganizationRead,
    status_code=201,
    summary="Create a new organization",
)
async def create_organization(
    data: schemas.OrganizationCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_authenticated_user)],
) -> schemas.OrganizationRead:
    org = service.create_organization(db, data, owner_id=current_user.id)
    return schemas.OrganizationRead.model_validate(org)


@router.get(
    "/me",
    response_model=list[schemas.OrganizationWithRoleRead],
    summary="List organizations the current user belongs to",
)
async def list_my_organizations(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_authenticated_user)],
) -> list[schemas.OrganizationWithRoleRead]:
    return service.list_my_organizations(db, current_user.id)


@router.get(
    "/{org_id}",
    response_model=schemas.OrganizationRead,
    summary="Get organization details",
)
async def get_organization(
    org_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_authenticated_user)],
) -> schemas.OrganizationRead:
    org = service.get_organization(db, org_id, current_user.id)
    return schemas.OrganizationRead.model_validate(org)


@router.get(
    "/{org_id}/members",
    response_model=list[schemas.OrganizationMemberRead],
    summary="List organization members",
)
async def list_members(
    org_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_authenticated_user)],
) -> list[schemas.OrganizationMemberRead]:
    return service.list_members(db, org_id, current_user.id)


@router.post(
    "/{org_id}/members",
    response_model=schemas.OrganizationMemberRead,
    status_code=201,
    summary="Add a member to the organization by email",
)
async def add_member(
    org_id: UUID,
    data: schemas.OrganizationMemberCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_authenticated_user)],
) -> schemas.OrganizationMemberRead:
    return service.add_member(db, org_id, data, acting_user_id=current_user.id)


@router.patch(
    "/{org_id}/members/{member_id}",
    response_model=schemas.OrganizationMemberRead,
    summary="Update a member's role or status",
)
async def update_member(
    org_id: UUID,
    member_id: UUID,
    data: schemas.OrganizationMemberUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_authenticated_user)],
) -> schemas.OrganizationMemberRead:
    return service.update_member(db, org_id, member_id, data, acting_user_id=current_user.id)
