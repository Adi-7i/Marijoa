from __future__ import annotations

import json
from functools import lru_cache

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # Application
    APP_NAME: str = "Marijoa Backend"
    APP_VERSION: str = "0.1.0"
    APP_ENV: str = "development"
    DEBUG: bool = False

    # API
    API_V1_PREFIX: str = "/api/v1"

    # Database
    DATABASE_URL: str = "postgresql+psycopg://app_user:change_me@localhost:5432/Marijoa"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # JWT
    JWT_SECRET_KEY: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # CORS — stored as str; use .cors_origins for the parsed list.
    # Accepts a comma-separated string or a JSON array string.
    BACKEND_CORS_ORIGINS: str = "http://localhost:3000"

    # Storage
    LOCAL_STORAGE_PATH: str = "/tmp/marijoa/uploads"
    MAX_UPLOAD_SIZE_MB: int = 20

    # Logging
    LOG_LEVEL: str = "INFO"

    # ------------------------------------------------------------------
    # Validators
    # ------------------------------------------------------------------

    @field_validator("APP_ENV")
    @classmethod
    def validate_env(cls, v: str) -> str:
        allowed = {"development", "staging", "production", "test"}
        if v not in allowed:
            raise ValueError(f"APP_ENV must be one of {allowed}")
        return v

    @model_validator(mode="after")
    def enforce_production_secrets(self) -> "Settings":
        if self.APP_ENV == "production":
            if self.JWT_SECRET_KEY == "change-me-in-production":
                raise ValueError("JWT_SECRET_KEY must be set to a strong secret in production")
            if "change_me" in self.DATABASE_URL:
                raise ValueError("DATABASE_URL must use real credentials in production")
        return self

    # ------------------------------------------------------------------
    # Derived properties
    # ------------------------------------------------------------------

    @property
    def cors_origins(self) -> list[str]:
        """Parse BACKEND_CORS_ORIGINS as a JSON array or comma-separated string."""
        raw = self.BACKEND_CORS_ORIGINS.strip()
        if raw.startswith("["):
            try:
                return json.loads(raw)
            except json.JSONDecodeError:
                pass
        return [origin.strip() for origin in raw.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
