from __future__ import annotations

import logging
from datetime import timedelta
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.exceptions import AuthenticationError, AuthorizationError, ConflictError
from app.modules.auth import repository as auth_repo
from app.modules.auth import security
from app.modules.auth.schemas import LoginRequest, RegisterRequest
from app.modules.users import repository as user_repo
from app.modules.users.model import User
from app.modules.users.schemas import UserCreateInternal
from app.utils.datetime_utils import utc_now

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _store_refresh_token(
    db: Session,
    user_id: UUID,
    *,
    created_by_ip: str | None = None,
    user_agent: str | None = None,
) -> str:
    """Generate, hash, and persist a new refresh token. Returns the raw value."""
    settings = get_settings()
    raw_value = security.create_refresh_token_value()
    token_hash = security.hash_token(raw_value)
    expires_at = utc_now() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    auth_repo.create_refresh_token(
        db,
        user_id=user_id,
        token_hash=token_hash,
        expires_at=expires_at,
        created_by_ip=created_by_ip,
        user_agent=user_agent,
    )
    return raw_value


# ---------------------------------------------------------------------------
# Public service operations
# ---------------------------------------------------------------------------

def register(db: Session, data: RegisterRequest) -> tuple[User, str, str]:
    """Create a new user and issue tokens.

    Returns (user, access_token, refresh_token_raw_value).
    Raises ConflictError if the email is already registered.
    """
    if user_repo.get_user_by_email(db, data.email) is not None:
        raise ConflictError("This email address is already registered")

    password_hash = security.hash_password(data.password)
    user = user_repo.create_user(
        db,
        UserCreateInternal(
            full_name=data.full_name,
            email=data.email,
            password_hash=password_hash,
        ),
    )

    access_token = security.create_access_token(str(user.id))
    refresh_token = _store_refresh_token(db, user.id)

    db.commit()
    db.refresh(user)
    return user, access_token, refresh_token


def login(
    db: Session,
    data: LoginRequest,
    *,
    created_by_ip: str | None = None,
    user_agent: str | None = None,
) -> tuple[User, str, str]:
    """Authenticate credentials and issue tokens.

    Returns (user, access_token, refresh_token_raw_value).
    The error message is intentionally generic to avoid user enumeration.
    """
    user = user_repo.get_user_by_email(db, data.email)
    if user is None or not security.verify_password(data.password, user.password_hash):
        raise AuthenticationError("Invalid email or password")

    if not user.is_active:
        raise AuthorizationError("Account is inactive")

    user.last_login_at = utc_now()

    access_token = security.create_access_token(str(user.id))
    refresh_token = _store_refresh_token(db, user.id, created_by_ip=created_by_ip, user_agent=user_agent)

    db.commit()
    db.refresh(user)
    return user, access_token, refresh_token


def refresh_tokens(db: Session, refresh_token_raw: str) -> tuple[User, str, str]:
    """Validate a refresh token and issue a rotated pair.

    Returns (user, new_access_token, new_refresh_token_raw_value).
    The consumed token is always revoked, even on error, to prevent reuse.
    """
    token_hash = security.hash_token(refresh_token_raw)
    stored = auth_repo.get_token_by_hash(db, token_hash)

    if stored is None or stored.revoked_at is not None:
        raise AuthenticationError("Invalid or revoked refresh token")
    if stored.expires_at < utc_now():
        raise AuthenticationError("Refresh token has expired")

    user = db.get(User, stored.user_id)
    if user is None or not user.is_active:
        raise AuthorizationError("User account is unavailable")

    # Rotate: revoke current token and issue a new pair
    auth_repo.revoke_token(db, stored)
    new_access = security.create_access_token(str(user.id))
    new_refresh = _store_refresh_token(db, user.id)

    db.commit()
    db.refresh(user)
    return user, new_access, new_refresh


def logout(db: Session, refresh_token_raw: str) -> None:
    """Revoke the supplied refresh token.

    Silent no-op if the token is already revoked or unknown — prevents
    information leakage about token existence.
    """
    token_hash = security.hash_token(refresh_token_raw)
    stored = auth_repo.get_token_by_hash(db, token_hash)
    if stored is not None and stored.revoked_at is None:
        auth_repo.revoke_token(db, stored)
        db.commit()
