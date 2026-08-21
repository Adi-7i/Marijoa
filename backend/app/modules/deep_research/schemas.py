from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import Field

from app.modules.deep_research.models import ResearchSessionStatus, ResearchStepStatus
from app.schemas.base import AppSchema


class ResearchStepPlan(AppSchema):
    step_key: str
    title: str
    description: str | None = None
    order_index: int
    status: ResearchStepStatus = ResearchStepStatus.PENDING
    progress_percent: int | None = None


class ResearchPlan(AppSchema):
    title: str
    objectives: list[str]
    search_queries: list[str]
    steps: list[ResearchStepPlan]


class DeepResearchSessionCreate(AppSchema):
    workspace_id: UUID
    chat_id: UUID | None = None
    query: str = Field(min_length=3, max_length=5000)
    mode: str = Field(default="standard", min_length=1, max_length=40)


class DeepResearchSessionPlanResponse(AppSchema):
    session_id: UUID
    status: ResearchSessionStatus
    title: str
    query: str
    objectives: list[str]
    search_queries: list[str]
    steps: list[ResearchStepPlan]
    created_at: datetime


class DeepResearchSessionRead(AppSchema):
    id: UUID
    user_id: UUID
    organization_id: UUID | None
    workspace_id: UUID
    chat_id: UUID | None
    query: str
    title: str | None
    mode: str
    status: ResearchSessionStatus
    progress_percent: int
    current_step: str | None
    error_message: str | None
    metadata_json: dict | None
    created_at: datetime
    updated_at: datetime
    started_at: datetime | None
    completed_at: datetime | None
    failed_at: datetime | None
    cancelled_at: datetime | None


class DeepResearchStepRead(AppSchema):
    id: UUID
    session_id: UUID
    step_key: str
    title: str
    description: str | None
    status: ResearchStepStatus
    order_index: int
    progress_percent: int | None
    created_at: datetime
    updated_at: datetime
    started_at: datetime | None
    completed_at: datetime | None


class DeepResearchSourceRead(AppSchema):
    id: UUID
    title: str
    url: str
    domain: str | None
    snippet: str | None
    rank: int | None
    score: float | None
    status: str
    fetched_at: datetime | None


class DeepResearchSessionDetail(AppSchema):
    session: DeepResearchSessionRead
    steps: list[DeepResearchStepRead]
    sources: list[DeepResearchSourceRead]
    source_count: int
    chunk_count: int
    report_ready: bool


class DeepResearchStartResponse(AppSchema):
    session_id: UUID
    status: ResearchSessionStatus
    job_id: str | None = None


class DeepResearchCancelResponse(AppSchema):
    session_id: UUID
    status: ResearchSessionStatus


class DeepResearchReportRead(AppSchema):
    id: UUID
    session_id: UUID
    title: str
    summary: str | None
    content_markdown: str
    citation_map_json: dict | None
    source_count: int
    citation_count: int
    pdf_file_id: UUID | None
    pdf_status: str | None
    created_at: datetime
    updated_at: datetime


class DeepResearchPdfExportResponse(AppSchema):
    status: str
    file_id: UUID | None = None
    download_url: str | None = None
    filename: str | None = None
    content_base64: str | None = None

