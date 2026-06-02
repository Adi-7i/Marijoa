from __future__ import annotations

import logging
from uuid import UUID

from app.core.config import get_settings
from app.db.session import SessionLocal
from app.modules.audit_logs import service as audit_service
from app.modules.deep_research import repository
from app.modules.deep_research.chunker import chunk_text
from app.modules.deep_research.citation_builder import build_citation_map
from app.modules.deep_research.content_extractor import extract_content
from app.modules.deep_research.evidence_retriever import select_evidence
from app.modules.deep_research.embeddings import EmbeddingsClient
from app.modules.deep_research.models import ResearchSessionStatus, ResearchSourceStatus, ResearchStepStatus
from app.modules.deep_research.progress import update_progress
from app.modules.deep_research.safe_fetcher import fetch_url
from app.modules.deep_research.search_orchestrator import run_multi_query_search
from app.modules.deep_research.source_ranker import rank_sources
from app.modules.deep_research.synthesizer import synthesize_report

logger = logging.getLogger(__name__)


def run_deep_research_session(session_id: UUID | str) -> None:
    db = SessionLocal()
    sid = UUID(str(session_id))
    try:
        settings = get_settings()
        session = repository.get_session(db, sid)
        if session is None:
            return
        repository.set_session_status(db, session, ResearchSessionStatus.RUNNING, progress_percent=10, current_step="searching")
        db.commit()

        meta = session.metadata_json or {}
        search_queries = list(meta.get("search_queries") or [session.query])
        objectives = list(meta.get("objectives") or [])

        update_progress(db, session_id=sid, step_key="searching")
        db.commit()
        raw_results = run_multi_query_search(search_queries)
        ranked = rank_sources(raw_results, max_sources=settings.DEEP_RESEARCH_MAX_SELECTED_SOURCES)
        sources = repository.upsert_sources(
            db,
            session_id=sid,
            sources=[
                {
                    "title": item.title,
                    "url": item.url,
                    "domain": item.domain,
                    "snippet": item.snippet,
                    "search_query": item.search_query,
                    "rank": item.rank,
                    "score": item.score,
                    "status": ResearchSourceStatus.SELECTED.value,
                }
                for item in ranked
            ],
        )
        update_progress(db, session_id=sid, step_key="searching", status=ResearchStepStatus.COMPLETED)
        update_progress(db, session_id=sid, step_key="ranking_sources", status=ResearchStepStatus.COMPLETED)
        db.commit()

        selected_with_content = []
        update_progress(db, session_id=sid, step_key="reading_sources")
        for source in sources:
            try:
                fetched = fetch_url(source.url)
                extracted = extract_content(
                    fetched.body,
                    content_type=fetched.content_type,
                    max_chars=settings.DEEP_RESEARCH_MAX_SOURCE_CHARS,
                )
                if extracted is None:
                    raise ValueError("Not enough readable content")
                source.fetch_status = "ok"
                source.http_status = fetched.status_code
                source.content_type = fetched.content_type
                source.content_hash = extracted.content_hash
                source.extracted_chars = extracted.char_count
                source.status = ResearchSourceStatus.EXTRACTED.value
                source.fetched_at = repository.utcnow()
                selected_with_content.append((source, extracted.text))
            except Exception as exc:  # noqa: BLE001
                source.status = ResearchSourceStatus.FAILED.value
                source.fetch_status = "failed"
                source.error_message = clean_error(exc)
        if not selected_with_content:
            raise RuntimeError("No readable sources were available for Deep Research.")
        update_progress(db, session_id=sid, step_key="reading_sources", status=ResearchStepStatus.COMPLETED)
        update_progress(db, session_id=sid, step_key="extracting", status=ResearchStepStatus.COMPLETED)
        db.commit()

        all_chunks = []
        for source, text in selected_with_content:
            chunks = chunk_text(
                text,
                chunk_size_chars=settings.DEEP_RESEARCH_CHUNK_SIZE_CHARS,
                overlap_chars=settings.DEEP_RESEARCH_CHUNK_OVERLAP_CHARS,
                max_chunks=settings.DEEP_RESEARCH_MAX_TOTAL_CHUNKS,
            )
            all_chunks.extend(repository.add_chunks(db, session_id=sid, source_id=source.id, chunks=chunks))
        db.commit()

        update_progress(db, session_id=sid, step_key="embedding")
        client = EmbeddingsClient()
        vectors = client.embed_texts([chunk.content for chunk in all_chunks])
        if vectors:
            for chunk, vector in zip(all_chunks, vectors, strict=False):
                chunk.embedding = vector
                chunk.embedding_model = client.model
        else:
            meta = dict(session.metadata_json or {})
            meta["embeddings_fallback"] = True
            session.metadata_json = meta
        update_progress(db, session_id=sid, step_key="embedding", status=ResearchStepStatus.COMPLETED)
        db.commit()

        update_progress(db, session_id=sid, step_key="analyzing")
        citation_map = build_citation_map([source for source, _ in selected_with_content])
        evidence = select_evidence(
            query=session.query,
            objectives=objectives,
            chunks=all_chunks,
            citation_map=citation_map,
            top_k=settings.DEEP_RESEARCH_TOP_EVIDENCE_CHUNKS,
            max_context_chars=settings.DEEP_RESEARCH_EVIDENCE_CONTEXT_MAX_CHARS,
        )
        update_progress(db, session_id=sid, step_key="analyzing", status=ResearchStepStatus.COMPLETED)
        update_progress(db, session_id=sid, step_key="writing_report")
        markdown, summary = synthesize_report(
            query=session.query,
            title=session.title or "Deep Research Report",
            objectives=objectives,
            evidence=evidence,
            citation_map=citation_map,
        )
        repository.create_report(
            db,
            session_id=sid,
            title=session.title or "Deep Research Report",
            summary=summary,
            content_markdown=markdown,
            citation_map=citation_map,
            source_count=len(selected_with_content),
            citation_count=len(citation_map),
            metadata_json={"evidence_count": len(evidence)},
        )
        update_progress(db, session_id=sid, step_key="writing_report", status=ResearchStepStatus.COMPLETED)
        repository.set_session_status(db, session, ResearchSessionStatus.COMPLETED)
        audit_service.record_event(
            db,
            action="DEEP_RESEARCH_COMPLETED",
            entity_type="deep_research_session",
            entity_id=session.id,
            user_id=session.user_id,
            organization_id=session.organization_id,
            workspace_id=session.workspace_id,
            metadata={"source_count": len(selected_with_content), "citation_count": len(citation_map)},
        )
        db.commit()
    except Exception as exc:  # noqa: BLE001
        logger.warning("Deep Research job failed: session=%s exc_type=%s", sid, type(exc).__name__)
        session = repository.get_session(db, sid)
        if session is not None:
            repository.set_session_status(
                db,
                session,
                ResearchSessionStatus.FAILED,
                progress_percent=session.progress_percent,
                current_step=session.current_step or "failed",
                error_message=clean_error(exc),
            )
            audit_service.record_event(
                db,
                action="DEEP_RESEARCH_FAILED",
                entity_type="deep_research_session",
                entity_id=session.id,
                user_id=session.user_id,
                organization_id=session.organization_id,
                workspace_id=session.workspace_id,
                metadata={"error_type": type(exc).__name__},
            )
            db.commit()
    finally:
        db.close()


def clean_error(exc: Exception) -> str:
    return str(exc).splitlines()[0][:500] or type(exc).__name__
