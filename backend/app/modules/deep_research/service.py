from __future__ import annotations

from uuid import UUID

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.exceptions import InvalidOperationError, ResourceNotFoundError
from app.modules.audit_logs import service as audit_service
from app.modules.chats import service as chat_service
from app.modules.deep_research import permissions, repository
from app.modules.deep_research.exceptions import DeepResearchDisabledError
from app.modules.deep_research.exporter import pdf_base64
from app.modules.deep_research.models import ResearchSessionStatus
from app.modules.deep_research.planner import create_plan
from app.modules.deep_research.schemas import (
    DeepResearchPdfExportResponse,
    DeepResearchSessionCreate,
    DeepResearchSessionDetail,
    DeepResearchSessionPlanResponse,
    DeepResearchStartResponse,
)
from app.modules.workspaces import repository as workspace_repo
from app.workers.enqueue import enqueue_job


def create_research_session(
    db: Session, data: DeepResearchSessionCreate, *, user_id: UUID
) -> DeepResearchSessionPlanResponse:
    settings = get_settings()
    if not settings.DEEP_RESEARCH_ENABLED:
        raise DeepResearchDisabledError()
    permissions.require_create_access(db, user_id=user_id, workspace_id=data.workspace_id)
    workspace = workspace_repo.get_workspace_by_id(db, data.workspace_id)
    if workspace is None:
        raise ResourceNotFoundError("Workspace", data.workspace_id)
    if data.chat_id is not None:
        chat = chat_service.get_chat(db, data.chat_id, user_id)
        if chat.workspace_id != data.workspace_id:
            raise InvalidOperationError("Chat does not belong to the selected workspace")

    session = repository.create_session(
        db,
        user_id=user_id,
        organization_id=workspace.organization_id,
        workspace_id=data.workspace_id,
        chat_id=data.chat_id,
        query=data.query.strip(),
        mode=data.mode or settings.DEEP_RESEARCH_DEFAULT_MODE,
    )
    plan = create_plan(session.query, mode=session.mode)
    repository.apply_plan(db, session, plan)
    audit_service.record_event(
        db,
        action="DEEP_RESEARCH_SESSION_CREATED",
        entity_type="deep_research_session",
        entity_id=session.id,
        user_id=user_id,
        organization_id=workspace.organization_id,
        workspace_id=data.workspace_id,
        metadata={"mode": session.mode},
    )
    db.commit()
    db.refresh(session)
    return DeepResearchSessionPlanResponse(
        session_id=session.id,
        status=ResearchSessionStatus(session.status),
        title=session.title or plan.title,
        query=session.query,
        objectives=plan.objectives,
        search_queries=plan.search_queries,
        steps=plan.steps,
        created_at=session.created_at,
    )


def get_session_or_404(db: Session, session_id: UUID, *, user_id: UUID):
    session = repository.get_session(db, session_id)
    if session is None:
        raise ResourceNotFoundError("Deep Research session", session_id)
    permissions.require_read_access(db, user_id=user_id, session=session)
    return session


def get_session_detail(db: Session, session_id: UUID, *, user_id: UUID) -> DeepResearchSessionDetail:
    session = get_session_or_404(db, session_id, user_id=user_id)
    steps = repository.list_steps(db, session_id)
    sources = repository.list_sources(db, session_id)
    return DeepResearchSessionDetail(
        session=session,
        steps=steps,
        sources=sources,
        source_count=len(sources),
        chunk_count=repository.count_chunks(db, session_id),
        report_ready=repository.get_report(db, session_id) is not None,
    )


def list_workspace_sessions(db: Session, workspace_id: UUID, *, user_id: UUID):
    permissions.require_read_access(
        db,
        user_id=user_id,
        session=type("_Session", (), {"workspace_id": workspace_id})(),  # permission helper only needs workspace_id
    )
    return repository.list_sessions_for_workspace(db, workspace_id)


def start_session(db: Session, session_id: UUID, *, user_id: UUID) -> DeepResearchStartResponse:
    session = get_session_or_404(db, session_id, user_id=user_id)
    permissions.require_start_access(db, user_id=user_id, session=session)
    if ResearchSessionStatus(session.status) != ResearchSessionStatus.PLANNED:
        raise InvalidOperationError("Only PLANNED sessions can be started")
    repository.set_session_status(
        db,
        session,
        ResearchSessionStatus.RUNNING,
        progress_percent=10,
        current_step="queued",
    )
    from app.workers.tasks.deep_research import run_deep_research_session

    job_id = enqueue_job(
        get_settings().RQ_RESEARCH_QUEUE,
        run_deep_research_session,
        str(session.id),
    )
    audit_service.record_event(
        db,
        action="DEEP_RESEARCH_STARTED",
        entity_type="deep_research_session",
        entity_id=session.id,
        user_id=user_id,
        organization_id=session.organization_id,
        workspace_id=session.workspace_id,
    )
    db.commit()
    return DeepResearchStartResponse(
        session_id=session.id,
        status=ResearchSessionStatus(session.status),
        job_id=job_id,
    )


def cancel_session(db: Session, session_id: UUID, *, user_id: UUID):
    session = get_session_or_404(db, session_id, user_id=user_id)
    permissions.require_start_access(db, user_id=user_id, session=session)
    if ResearchSessionStatus(session.status) not in {
        ResearchSessionStatus.PLANNED,
        ResearchSessionStatus.RUNNING,
    }:
        raise InvalidOperationError("Only PLANNED or RUNNING sessions can be cancelled")
    repository.set_session_status(db, session, ResearchSessionStatus.CANCELLED, current_step="cancelled")
    audit_service.record_event(
        db,
        action="DEEP_RESEARCH_CANCELLED",
        entity_type="deep_research_session",
        entity_id=session.id,
        user_id=user_id,
        organization_id=session.organization_id,
        workspace_id=session.workspace_id,
    )
    db.commit()
    return session


def get_report(db: Session, session_id: UUID, *, user_id: UUID):
    session = get_session_or_404(db, session_id, user_id=user_id)
    report = repository.get_report(db, session.id)
    if report is None:
        raise ResourceNotFoundError("Deep Research report", session_id)
    return report


def export_pdf(db: Session, session_id: UUID, *, user_id: UUID) -> DeepResearchPdfExportResponse:
    session = get_session_or_404(db, session_id, user_id=user_id)
    report = repository.get_report(db, session.id)
    if report is None:
        raise ResourceNotFoundError("Deep Research report", session_id)
    encoded = pdf_base64(report.title, report.content_markdown, report.citation_map_json)
    audit_service.record_event(
        db,
        action="DEEP_RESEARCH_PDF_EXPORTED",
        entity_type="deep_research_report",
        entity_id=report.id,
        user_id=user_id,
        organization_id=session.organization_id,
        workspace_id=session.workspace_id,
    )
    db.commit()
    return DeepResearchPdfExportResponse(
        status="ready",
        filename=f"deep-research-{session.id}.pdf",
        content_base64=encoded,
    )

