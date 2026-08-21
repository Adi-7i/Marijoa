from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.db.session import SessionLocal, get_db
from app.modules.auth.dependencies import require_authenticated_user
from app.modules.deep_research import repository, schemas, service
from app.modules.deep_research.progress import poll_events
from app.modules.users.model import User

router = APIRouter(prefix="/deep-research", tags=["deep-research"])


@router.post("/sessions", response_model=schemas.DeepResearchSessionPlanResponse, status_code=201)
async def create_session(
    data: schemas.DeepResearchSessionCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_authenticated_user)],
) -> schemas.DeepResearchSessionPlanResponse:
    return service.create_research_session(db, data, user_id=current_user.id)


@router.get("/sessions/{session_id}", response_model=schemas.DeepResearchSessionDetail)
async def get_session(
    session_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_authenticated_user)],
) -> schemas.DeepResearchSessionDetail:
    return service.get_session_detail(db, session_id, user_id=current_user.id)


@router.post("/sessions/{session_id}/start", response_model=schemas.DeepResearchStartResponse)
async def start_session(
    session_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_authenticated_user)],
) -> schemas.DeepResearchStartResponse:
    return service.start_session(db, session_id, user_id=current_user.id)


@router.post("/sessions/{session_id}/cancel", response_model=schemas.DeepResearchCancelResponse)
async def cancel_session(
    session_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_authenticated_user)],
) -> schemas.DeepResearchCancelResponse:
    session = service.cancel_session(db, session_id, user_id=current_user.id)
    return schemas.DeepResearchCancelResponse(session_id=session.id, status=session.status)


@router.get("/sessions/{session_id}/events")
async def session_events(
    session_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_authenticated_user)],
) -> StreamingResponse:
    service.get_session_or_404(db, session_id, user_id=current_user.id)
    return StreamingResponse(
        poll_events(SessionLocal, session_id),
        media_type="text/event-stream",
    )


@router.get("/sessions/{session_id}/report", response_model=schemas.DeepResearchReportRead)
async def get_report(
    session_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_authenticated_user)],
) -> schemas.DeepResearchReportRead:
    return service.get_report(db, session_id, user_id=current_user.id)


@router.post("/sessions/{session_id}/export/pdf", response_model=schemas.DeepResearchPdfExportResponse)
async def export_pdf(
    session_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_authenticated_user)],
) -> schemas.DeepResearchPdfExportResponse:
    return service.export_pdf(db, session_id, user_id=current_user.id)


@router.get("/workspaces/{workspace_id}/sessions", response_model=list[schemas.DeepResearchSessionRead])
async def list_workspace_sessions(
    workspace_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_authenticated_user)],
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> list:
    service.list_workspace_sessions(db, workspace_id, user_id=current_user.id)
    return repository.list_sessions_for_workspace(db, workspace_id, limit=limit, offset=offset)

