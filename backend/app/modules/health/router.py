from __future__ import annotations

from fastapi import APIRouter

from app.core.constants import API_V1, APP_SERVICE_NAME
from app.modules.health.schemas import HealthV1Response

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthV1Response, summary="API v1 health check")
async def health_v1() -> HealthV1Response:
    return HealthV1Response(status="ok", service=APP_SERVICE_NAME, api_version=API_V1)
