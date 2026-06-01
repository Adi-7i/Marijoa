from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.exceptions import AuthenticationError, AuthorizationError
from app.db.session import get_db
from app.modules.auth import security
from app.modules.users.model import User

_http_bearer = HTTPBearer(
    scheme_name="Bearer token",
    description="Paste the `access_token` value from the login/register response.",
    auto_error=False,
)


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_http_bearer)],
    db: Annotated[Session, Depends(get_db)],
) -> User:
    """Extract and validate the Bearer token, then load the corresponding user."""
    if credentials is None:
        raise AuthenticationError("Authentication required")

    payload = security.decode_access_token(credentials.credentials)
    subject = payload.get("sub", "")

    try:
        user_id = UUID(subject)
    except ValueError:
        raise AuthenticationError("Invalid token claims")

    user = db.get(User, user_id)
    if user is None:
        raise AuthenticationError("Token refers to a user that no longer exists")

    return user


async def get_current_active_user(
    user: Annotated[User, Depends(get_current_user)],
) -> User:
    """Extend get_current_user with an is_active check."""
    if not user.is_active:
        raise AuthorizationError("Account is inactive")
    return user


# Explicit alias — routes that need a clear semantic name can import this
require_authenticated_user = get_current_active_user
