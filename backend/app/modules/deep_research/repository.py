from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.modules.deep_research.models import (
    DeepResearchChunk,
    DeepResearchReport,
    DeepResearchSession,
    DeepResearchSource,
    DeepResearchStep,
    ResearchSessionStatus,
    ResearchSourceStatus,
    ResearchStepStatus,
)
from app.modules.deep_research.schemas import ResearchPlan


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def create_session(
    db: Session,
    *,
    user_id: UUID,
    organization_id: UUID | None,
    workspace_id: UUID,
    chat_id: UUID | None,
    query: str,
    mode: str,
) -> DeepResearchSession:
    session = DeepResearchSession(
        user_id=user_id,
        organization_id=organization_id,
        workspace_id=workspace_id,
        chat_id=chat_id,
        query=query,
        mode=mode,
        status=ResearchSessionStatus.DRAFT.value,
        progress_percent=0,
    )
    db.add(session)
    db.flush()
    return session


def apply_plan(db: Session, session: DeepResearchSession, plan: ResearchPlan) -> None:
    session.title = plan.title
    session.status = ResearchSessionStatus.PLANNED.value
    session.progress_percent = 5
    session.current_step = "planning"
    session.metadata_json = {
        **(session.metadata_json or {}),
        "objectives": plan.objectives,
        "search_queries": plan.search_queries,
    }
    for step in plan.steps:
        db.add(
            DeepResearchStep(
                session_id=session.id,
                step_key=step.step_key,
                title=step.title,
                description=step.description,
                status=ResearchStepStatus.PENDING.value,
                order_index=step.order_index,
                progress_percent=step.progress_percent,
            )
        )
    db.flush()


def get_session(db: Session, session_id: UUID) -> DeepResearchSession | None:
    return db.get(DeepResearchSession, session_id)


def list_sessions_for_workspace(
    db: Session, workspace_id: UUID, *, limit: int = 50, offset: int = 0
) -> list[DeepResearchSession]:
    return list(
        db.scalars(
            select(DeepResearchSession)
            .where(DeepResearchSession.workspace_id == workspace_id)
            .order_by(DeepResearchSession.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
    )


def list_steps(db: Session, session_id: UUID) -> list[DeepResearchStep]:
    return list(
        db.scalars(
            select(DeepResearchStep)
            .where(DeepResearchStep.session_id == session_id)
            .order_by(DeepResearchStep.order_index)
        )
    )


def list_sources(db: Session, session_id: UUID) -> list[DeepResearchSource]:
    return list(
        db.scalars(
            select(DeepResearchSource)
            .where(DeepResearchSource.session_id == session_id)
            .order_by(DeepResearchSource.rank.asc().nullslast(), DeepResearchSource.created_at)
        )
    )


def list_chunks(db: Session, session_id: UUID) -> list[DeepResearchChunk]:
    return list(
        db.scalars(
            select(DeepResearchChunk)
            .where(DeepResearchChunk.session_id == session_id)
            .order_by(DeepResearchChunk.chunk_index)
        )
    )


def count_chunks(db: Session, session_id: UUID) -> int:
    return db.scalar(
        select(func.count()).select_from(DeepResearchChunk).where(DeepResearchChunk.session_id == session_id)
    ) or 0


def get_report(db: Session, session_id: UUID) -> DeepResearchReport | None:
    return db.scalar(select(DeepResearchReport).where(DeepResearchReport.session_id == session_id))


def set_session_status(
    db: Session,
    session: DeepResearchSession,
    status: ResearchSessionStatus,
    *,
    progress_percent: int | None = None,
    current_step: str | None = None,
    error_message: str | None = None,
) -> None:
    session.status = status.value
    if progress_percent is not None:
        session.progress_percent = progress_percent
    if current_step is not None:
        session.current_step = current_step
    if error_message is not None:
        session.error_message = error_message
    now = utcnow()
    if status == ResearchSessionStatus.RUNNING and session.started_at is None:
        session.started_at = now
    if status == ResearchSessionStatus.COMPLETED:
        session.completed_at = now
        session.progress_percent = 100
        session.current_step = "completed"
    if status == ResearchSessionStatus.FAILED:
        session.failed_at = now
    if status == ResearchSessionStatus.CANCELLED:
        session.cancelled_at = now
    db.flush()


def update_step_status(
    db: Session,
    *,
    session_id: UUID,
    step_key: str,
    status: ResearchStepStatus,
    progress_percent: int | None = None,
) -> None:
    step = db.scalar(
        select(DeepResearchStep)
        .where(DeepResearchStep.session_id == session_id)
        .where(DeepResearchStep.step_key == step_key)
    )
    if step is None:
        return
    step.status = status.value
    if progress_percent is not None:
        step.progress_percent = progress_percent
    now = utcnow()
    if status == ResearchStepStatus.RUNNING and step.started_at is None:
        step.started_at = now
    if status in {ResearchStepStatus.COMPLETED, ResearchStepStatus.FAILED, ResearchStepStatus.SKIPPED}:
        step.completed_at = now
    db.flush()


def upsert_sources(db: Session, *, session_id: UUID, sources: list[dict]) -> list[DeepResearchSource]:
    existing = {s.url: s for s in list_sources(db, session_id)}
    saved: list[DeepResearchSource] = []
    for item in sources:
        url = item["url"]
        source = existing.get(url)
        if source is None:
            source = DeepResearchSource(
                session_id=session_id,
                title=item["title"],
                url=url,
                domain=item.get("domain"),
                snippet=item.get("snippet"),
                search_query=item.get("search_query"),
                rank=item.get("rank"),
                score=item.get("score"),
                status=item.get("status", ResearchSourceStatus.DISCOVERED.value),
            )
            db.add(source)
        else:
            source.rank = item.get("rank", source.rank)
            source.score = item.get("score", source.score)
            source.status = item.get("status", source.status)
        saved.append(source)
    db.flush()
    return saved


def add_chunks(
    db: Session,
    *,
    session_id: UUID,
    source_id: UUID,
    chunks: list[str],
) -> list[DeepResearchChunk]:
    saved: list[DeepResearchChunk] = []
    for index, content in enumerate(chunks):
        chunk = DeepResearchChunk(
            session_id=session_id,
            source_id=source_id,
            chunk_index=index,
            content=content,
            char_count=len(content),
            token_count=max(1, len(content.split())),
        )
        db.add(chunk)
        saved.append(chunk)
    db.flush()
    return saved


def create_report(
    db: Session,
    *,
    session_id: UUID,
    title: str,
    summary: str | None,
    content_markdown: str,
    citation_map: dict,
    source_count: int,
    citation_count: int,
    metadata_json: dict | None = None,
) -> DeepResearchReport:
    report = DeepResearchReport(
        session_id=session_id,
        title=title,
        summary=summary,
        content_markdown=content_markdown,
        citation_map_json=citation_map,
        source_count=source_count,
        citation_count=citation_count,
        metadata_json=metadata_json,
    )
    db.add(report)
    db.flush()
    return report

