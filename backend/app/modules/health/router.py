from __future__ import annotations

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.core.constants import API_V1, APP_SERVICE_NAME
from app.db.health import check_database_connectivity
from app.modules.health.schemas import DbHealthResponse, HealthV1Response

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthV1Response, summary="API v1 health check")
async def health_v1() -> HealthV1Response:
    return HealthV1Response(status="ok", service=APP_SERVICE_NAME, api_version=API_V1)


@router.get(
    "/health/db",
    response_model=DbHealthResponse,
    summary="Database connectivity check",
    responses={
        200: {"description": "Database reachable"},
        503: {"description": "Database unavailable", "model": DbHealthResponse},
    },
)
async def health_db() -> JSONResponse:
    if check_database_connectivity():
        return JSONResponse(
            status_code=200,
            content=DbHealthResponse(status="ok", database="connected").model_dump(),
        )
    return JSONResponse(
        status_code=503,
        content=DbHealthResponse(status="error", database="unavailable").model_dump(),
    )
