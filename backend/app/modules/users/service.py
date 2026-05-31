from __future__ import annotations

from uuid import UUID

from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, ResourceNotFoundError
from app.modules.users import repository
from app.modules.users.model import User
from app.modules.users.schemas import UserCreateInternal, UserUpdateInternal


def get_user_by_id(db: Session, user_id: UUID) -> User:
    """Return a user by primary key or raise ResourceNotFoundError."""
    user = repository.get_user_by_id(db, user_id)
    if user is None:
        raise ResourceNotFoundError("User", user_id)
    return user


def get_user_by_email(db: Session, email: str) -> User:
    """Return a user by email (case-insensitive) or raise ResourceNotFoundError."""
    user = repository.get_user_by_email(db, email)
    if user is None:
        raise ResourceNotFoundError("User")
    return user


def create_user(db: Session, data: UserCreateInternal) -> User:
    """Create and persist a new user.

    Raises ConflictError if the email address is already registered.
    Raises no exceptions for DB errors — those propagate as-is and are
    caught by the global handler in app/core/exceptions.py.

    Note: password_hash must be supplied by the caller (auth layer, Step 7).
    This function does not perform any password hashing.
    """
    existing = repository.get_user_by_email(db, data.email)
    if existing is not None:
        raise ConflictError("A user with this email address is already registered")

    user = repository.create_user(db, data)
    db.commit()
    db.refresh(user)
    return user


def update_user(db: Session, user_id: UUID, data: UserUpdateInternal) -> User:
    """Apply a partial update to an existing user.

    Raises ResourceNotFoundError if the user does not exist.
    """
    user = get_user_by_id(db, user_id)
    updated = repository.update_user(db, user, data)
    db.commit()
    db.refresh(updated)
    return updated
