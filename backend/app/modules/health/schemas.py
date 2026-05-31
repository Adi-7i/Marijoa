from __future__ import annotations

from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    service: str


class HealthV1Response(HealthResponse):
    api_version: str


class RootResponse(BaseModel):
    service: str
    status: str
    version: str
    environment: str
