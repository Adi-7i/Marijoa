from __future__ import annotations

import os

os.environ["DEBUG"] = "false"

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.core.exceptions import AppException, app_exception_handler
from app.modules.deep_research.router import router


def test_pdf_export_endpoint_rejects_unauthenticated_user() -> None:
    app = FastAPI()
    app.add_exception_handler(AppException, app_exception_handler)
    app.include_router(router, prefix="/api/v1")
    client = TestClient(app)
    response = client.post("/api/v1/deep-research/sessions/00000000-0000-0000-0000-000000000001/export/pdf")
    assert response.status_code in {401, 403}
