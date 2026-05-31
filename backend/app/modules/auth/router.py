from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_db
from app.modules.auth import schemas, service
from app.modules.auth.dependencies import get_current_active_user
from app.modules.users.model import User

router = APIRouter(prefix="/auth", tags=["auth"])


def _build_auth_response(
    user: User, access_token: str, refresh_token: str
) -> schemas.AuthResponse:
    settings = get_settings()
    return schemas.AuthResponse(
        user=schemas.AuthUserResponse.model_validate(user),
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post(
    "/register",
    response_model=schemas.AuthResponse,
    status_code=201,
    summary="Register a new user",
)
async def register(
    data: schemas.RegisterRequest,
    db: Annotated[Session, Depends(get_db)],
) -> schemas.AuthResponse:
    user, access_token, refresh_token = service.register(db, data)
    return _build_auth_response(user, access_token, refresh_token)


@router.post("/login", response_model=schemas.AuthResponse, summary="Authenticate and receive tokens")
async def login(
    data: schemas.LoginRequest,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
) -> schemas.AuthResponse:
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    user, access_token, refresh_token = service.login(
        db, data, created_by_ip=client_ip, user_agent=user_agent
    )
    return _build_auth_response(user, access_token, refresh_token)


@router.post("/refresh", response_model=schemas.TokenResponse, summary="Rotate a refresh token")
async def refresh(
    data: schemas.RefreshRequest,
    db: Annotated[Session, Depends(get_db)],
) -> schemas.TokenResponse:
    _, access_token, new_refresh = service.refresh_tokens(db, data.refresh_token)
    settings = get_settings()
    return schemas.TokenResponse(
        access_token=access_token,
        refresh_token=new_refresh,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post("/logout", summary="Revoke the supplied refresh token")
async def logout(
    data: schemas.LogoutRequest,
    db: Annotated[Session, Depends(get_db)],
) -> dict[str, str]:
    service.logout(db, data.refresh_token)
    return {"message": "Logged out successfully"}


@router.get("/me", response_model=schemas.AuthUserResponse, summary="Return the current user's profile")
async def me(
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> schemas.AuthUserResponse:
    return schemas.AuthUserResponse.model_validate(current_user)
