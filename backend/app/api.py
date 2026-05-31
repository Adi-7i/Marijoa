from __future__ import annotations

from fastapi import APIRouter

from app.modules.health.router import router as health_router


def build_api_router(prefix: str) -> APIRouter:
    router = APIRouter(prefix=prefix)
    router.include_router(health_router)
    return router


# Instantiated lazily in main.py via create_app() to avoid import-time side effects.
# Exposed here for convenience; safe to import because get_settings() is cached.
from app.core.config import get_settings as _get_settings

api_router = build_api_router(_get_settings().API_V1_PREFIX)
