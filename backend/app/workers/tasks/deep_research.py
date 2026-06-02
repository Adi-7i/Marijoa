from __future__ import annotations

from uuid import UUID

from app.modules.deep_research.job_runner import run_deep_research_session as _run


def run_deep_research_session(session_id: UUID | str) -> None:
    _run(session_id)

