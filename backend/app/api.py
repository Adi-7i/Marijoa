from __future__ import annotations

from fastapi import APIRouter

from app.modules.admin.router import router as admin_router
from app.modules.ai_gateway.router import router as ai_gateway_router
from app.modules.artifacts.router import router as artifacts_router
from app.modules.auth.router import router as auth_router
from app.modules.chats.router import router as chats_router
from app.modules.deep_research.router import router as deep_research_router
from app.modules.files.router import router as files_router
from app.modules.health.router import router as health_router
from app.modules.invitations.router import (
    admin_router as invitations_admin_router,
    public_router as invitations_public_router,
)
from app.modules.messages.router import router as messages_router
from app.modules.organizations.router import router as organizations_router
from app.modules.personal.router import router as personal_router
from app.modules.web_search.router import router as web_search_router
from app.modules.workspaces.router import router as workspaces_router


def build_api_router(prefix: str) -> APIRouter:
    router = APIRouter(prefix=prefix)
    router.include_router(health_router)
    router.include_router(auth_router)
    router.include_router(personal_router)
    router.include_router(organizations_router)
    router.include_router(invitations_admin_router)
    router.include_router(invitations_public_router)
    router.include_router(workspaces_router)
    router.include_router(chats_router)
    router.include_router(messages_router)
    router.include_router(ai_gateway_router)
    router.include_router(web_search_router)
    router.include_router(deep_research_router)
    router.include_router(artifacts_router)
    router.include_router(files_router)
    router.include_router(admin_router)
    return router


from app.core.config import get_settings as _get_settings

api_router = build_api_router(_get_settings().API_V1_PREFIX)
