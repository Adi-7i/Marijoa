from __future__ import annotations

import json
import logging
from functools import lru_cache

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)

# Minimum byte length recommended by PyJWT for HS256 / HS512 signing keys.
# A shorter key produces an InsecureKeyLengthWarning and is treated as a hard
# failure when APP_ENV=production.
MIN_JWT_SECRET_BYTES = 32


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

    # Redis Cloud
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_ENABLED: bool = True
    REDIS_SOCKET_TIMEOUT_SECONDS: int = 5
    REDIS_CONNECT_TIMEOUT_SECONDS: int = 5
    REDIS_KEY_PREFIX: str = "marijoa"
    REDIS_HEALTHCHECK_ENABLED: bool = True

    # Rate limiting
    RATE_LIMIT_ENABLED: bool = True
    AUTH_LOGIN_RATE_LIMIT: int = 10
    AUTH_LOGIN_RATE_WINDOW_SECONDS: int = 60
    AI_RATE_LIMIT: int = 30
    AI_RATE_WINDOW_SECONDS: int = 60

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
    MAX_UPLOAD_SIZE_MB: int = 25

    # Azure Blob Storage
    AZURE_STORAGE_CONNECTION_STRING: str = "change_me"
    AZURE_STORAGE_CONTAINER_NAME: str = "marijoa-files"
    AZURE_STORAGE_ACCOUNT_NAME: str = "change_me"
    AZURE_STORAGE_PUBLIC_ACCESS: bool = False

    # File uploads
    ALLOWED_UPLOAD_MIME_TYPES: str = (
        "image/jpeg,image/png,image/gif,image/webp,"
        "application/pdf,"
        "text/plain,text/csv,"
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document,"
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,"
        "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    )
    FILE_DOWNLOAD_SAS_EXPIRE_MINUTES: int = 10

    # Logging
    LOG_LEVEL: str = "INFO"

    # ------------------------------------------------------------------
    # AI Gateway
    # ------------------------------------------------------------------
    AI_PROVIDER: str = "openai_compatible"
    OPENAI_COMPATIBLE_API_KEY: str = "change_me"
    OPENAI_COMPATIBLE_BASE_URL: str = "https://your-openai-compatible-endpoint.com/openai/v1"
    OPENAI_COMPATIBLE_MODEL: str = "claude-sonnet-4-6"
    AI_REQUEST_TIMEOUT_SECONDS: int = 60
    AI_MAX_OUTPUT_TOKENS: int = 1200
    AI_TEMPERATURE: float = 0.4
    AI_MAX_HISTORY_MESSAGES: int = 20

    # ------------------------------------------------------------------
    # Background Jobs (RQ)
    # ------------------------------------------------------------------
    BACKGROUND_JOBS_ENABLED: bool = True
    RQ_DEFAULT_QUEUE: str = "default"
    RQ_FILE_QUEUE: str = "files"
    RQ_AI_QUEUE: str = "ai"
    RQ_JOB_TIMEOUT_SECONDS: int = 600
    RQ_JOB_RESULT_TTL_SECONDS: int = 3600
    RQ_JOB_FAILURE_TTL_SECONDS: int = 86400

    # ------------------------------------------------------------------
    # Validators
    # ------------------------------------------------------------------

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def normalise_database_url(cls, v: str) -> str:
        # Ensure the psycopg v3 driver is used regardless of how the URL was written.
        # Handles postgresql:// and postgres:// (Heroku/cloud shorthand).
        if v.startswith("postgresql://") or v.startswith("postgres://"):
            v = v.replace("postgresql://", "postgresql+psycopg://", 1)
            v = v.replace("postgres://", "postgresql+psycopg://", 1)
        return v

    @field_validator("APP_ENV")
    @classmethod
    def validate_env(cls, v: str) -> str:
        allowed = {"development", "staging", "production", "test"}
        if v not in allowed:
            raise ValueError(f"APP_ENV must be one of {allowed}")
        return v

    @model_validator(mode="after")
    def enforce_production_secrets(self) -> "Settings":
        secret_bytes = len(self.JWT_SECRET_KEY.encode("utf-8"))
        if self.APP_ENV == "production":
            if self.JWT_SECRET_KEY == "change-me-in-production":
                raise ValueError(
                    "JWT_SECRET_KEY must be set to a strong secret in production"
                )
            if secret_bytes < MIN_JWT_SECRET_BYTES:
                raise ValueError(
                    "JWT_SECRET_KEY must be at least "
                    f"{MIN_JWT_SECRET_BYTES} bytes (got {secret_bytes}) for "
                    f"{self.JWT_ALGORITHM}. Generate one with: "
                    "python -c \"import secrets; print(secrets.token_urlsafe(48))\""
                )
            if "change_me" in self.DATABASE_URL:
                raise ValueError("DATABASE_URL must use real credentials in production")
        elif secret_bytes < MIN_JWT_SECRET_BYTES:
            # Development / staging — warn but do not crash so local dev keeps
            # working with placeholder secrets. Never print the secret itself.
            logger.warning(
                "JWT_SECRET_KEY is %d bytes; %s recommends >= %d bytes. "
                "Generate a stronger secret with: "
                "python -c \"import secrets; print(secrets.token_urlsafe(48))\"",
                secret_bytes,
                self.JWT_ALGORITHM,
                MIN_JWT_SECRET_BYTES,
            )
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
