from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import api_router
from app.core.config import get_settings
from app.core.constants import APP_SERVICE_NAME
from app.core.exceptions import AppException, app_exception_handler, unhandled_exception_handler
from app.core.logging import configure_logging
from app.modules.health.schemas import HealthResponse, RootResponse


def create_app() -> FastAPI:
    configure_logging()
    settings = get_settings()

    app = FastAPI(
        title="Marijoa Backend API",
        version=settings.APP_VERSION,
        debug=settings.DEBUG,
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.add_exception_handler(AppException, app_exception_handler)  # type: ignore[arg-type]
    app.add_exception_handler(Exception, unhandled_exception_handler)

    app.include_router(api_router)

    @app.get("/", response_model=RootResponse, tags=["root"], summary="Service info")
    async def root() -> RootResponse:
        return RootResponse(
            service=settings.APP_NAME,
            status="running",
            version=settings.APP_VERSION,
            environment=settings.APP_ENV,
        )

    @app.get("/health", response_model=HealthResponse, tags=["health"], summary="Basic health check")
    async def health() -> HealthResponse:
        return HealthResponse(status="ok", service=APP_SERVICE_NAME)

    return app


app = create_app()
