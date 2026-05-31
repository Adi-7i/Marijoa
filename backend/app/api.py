from __future__ import annotations

from fastapi import APIRouter

from app.modules.auth.router import router as auth_router
from app.modules.chats.router import router as chats_router
from app.modules.health.router import router as health_router
from app.modules.organizations.router import router as organizations_router
from app.modules.workspaces.router import router as workspaces_router


def build_api_router(prefix: str) -> APIRouter:
    router = APIRouter(prefix=prefix)
    router.include_router(health_router)
    router.include_router(auth_router)
    router.include_router(organizations_router)
    router.include_router(workspaces_router)
    router.include_router(chats_router)
    return router


from app.core.config import get_settings as _get_settings

api_router = build_api_router(_get_settings().API_V1_PREFIX)
