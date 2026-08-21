from __future__ import annotations

import json
from collections.abc import Iterator
from time import sleep
from uuid import UUID

from sqlalchemy.orm import Session

from app.modules.deep_research import repository
from app.modules.deep_research.models import ResearchSessionStatus, ResearchStepStatus


PROGRESS_PERCENT = {
    "planning": 5,
    "searching": 15,
    "ranking_sources": 25,
    "reading_sources": 40,
    "extracting": 50,
    "embedding": 65,
    "analyzing": 75,
    "writing_report": 90,
    "finalizing": 98,
    "completed": 100,
}


def format_sse_event(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data, default=str)}\n\n"


def update_progress(
    db: Session,
    *,
    session_id: UUID,
    step_key: str,
    status: ResearchStepStatus = ResearchStepStatus.RUNNING,
    message: str | None = None,
) -> None:
    session = repository.get_session(db, session_id)
    if session is None:
        return
    session.current_step = step_key
    session.progress_percent = PROGRESS_PERCENT.get(step_key, session.progress_percent)
    repository.update_step_status(
        db,
        session_id=session_id,
        step_key=step_key,
        status=status,
        progress_percent=session.progress_percent,
    )
    meta = dict(session.metadata_json or {})
    if message:
        meta["progress_message"] = message
    session.metadata_json = meta
    db.flush()


def event_snapshot(db: Session, session_id: UUID) -> dict:
    session = repository.get_session(db, session_id)
    if session is None:
        return {"missing": True}
    steps = repository.list_steps(db, session_id)
    sources = repository.list_sources(db, session_id)
    report = repository.get_report(db, session_id)
    return {
        "session_id": session.id,
        "status": session.status,
        "progress_percent": session.progress_percent,
        "current_step": session.current_step,
        "source_count": len(sources),
        "chunk_count": repository.count_chunks(db, session_id),
        "report_ready": report is not None,
        "sources": [
            {
                "id": source.id,
                "title": source.title,
                "url": source.url,
                "domain": source.domain,
                "status": source.status,
            }
            for source in sources
        ],
        "steps": [
            {
                "step_key": step.step_key,
                "title": step.title,
                "status": step.status,
                "progress_percent": step.progress_percent,
            }
            for step in steps
        ],
    }


def poll_events(db_factory, session_id: UUID, *, interval_seconds: float = 1.0) -> Iterator[str]:
    last_payload = ""
    seen_source_ids: set[str] = set()
    while True:
        db = db_factory()
        try:
            payload = event_snapshot(db, session_id)
            for source in payload.get("sources", []):
                source_id = str(source.get("id"))
                if source_id not in seen_source_ids:
                    seen_source_ids.add(source_id)
                    yield format_sse_event(
                        "source_found",
                        {
                            "title": source.get("title"),
                            "url": source.get("url"),
                            "domain": source.get("domain"),
                            "status": source.get("status"),
                        },
                    )
            encoded = json.dumps(payload, default=str, sort_keys=True)
            if encoded != last_payload:
                last_payload = encoded
                event = "research_status"
                if payload.get("status") == ResearchSessionStatus.COMPLETED.value:
                    event = "research_completed"
                elif payload.get("status") == ResearchSessionStatus.FAILED.value:
                    event = "research_failed"
                elif payload.get("status") == ResearchSessionStatus.CANCELLED.value:
                    event = "research_cancelled"
                yield format_sse_event(event, payload)
                if event in {"research_completed", "research_failed", "research_cancelled"}:
                    break
        finally:
            db.close()
        sleep(interval_seconds)
