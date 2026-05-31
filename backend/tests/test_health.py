from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_root_returns_200() -> None:
    response = client.get("/")
    assert response.status_code == 200


def test_root_response_shape() -> None:
    data = client.get("/").json()
    assert data["service"] == "Marijoa Backend"
    assert data["status"] == "running"
    assert "version" in data
    assert "environment" in data


def test_health_returns_200() -> None:
    response = client.get("/health")
    assert response.status_code == 200


def test_health_response_shape() -> None:
    data = client.get("/health").json()
    assert data["status"] == "ok"
    assert data["service"] == "marijoa-backend"


def test_api_v1_health_returns_200() -> None:
    response = client.get("/api/v1/health")
    assert response.status_code == 200


def test_api_v1_health_response_shape() -> None:
    data = client.get("/api/v1/health").json()
    assert data["status"] == "ok"
    assert data["service"] == "marijoa-backend"
    assert data["api_version"] == "v1"
