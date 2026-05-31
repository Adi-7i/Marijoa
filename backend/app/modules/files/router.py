from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, File as FastAPIFile, Form, Query, UploadFile
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.auth.dependencies import require_authenticated_user
from app.modules.files import service
from app.modules.files.schemas import FileDownloadUrlResponse, FileListResponse, FileRead
from app.modules.users.model import User

router = APIRouter(prefix="/files", tags=["files"])


@router.post(
    "/upload",
    response_model=FileRead,
    status_code=201,
    summary="Upload a file to a workspace",
)
async def upload_file(
    workspace_id: UUID = Form(...),
    file: UploadFile = FastAPIFile(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_authenticated_user),
) -> FileRead:
    result = await service.upload_file(
        db, workspace_id=workspace_id, file=file, user_id=current_user.id
    )
    return FileRead.model_validate(result)


@router.get(
    "",
    response_model=FileListResponse,
    summary="List files in a workspace",
)
def list_files(
    workspace_id: UUID = Query(...),
    status: str | None = Query(None),
    mime_type: str | None = Query(None),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_authenticated_user),
) -> FileListResponse:
    items, total = service.list_files(
        db,
        workspace_id=workspace_id,
        user_id=current_user.id,
        status_filter=status,
        mime_type_filter=mime_type,
        limit=limit,
        offset=offset,
    )
    return FileListResponse(
        items=[FileRead.model_validate(f) for f in items],
        total=total,
    )


@router.get(
    "/{file_id}",
    response_model=FileRead,
    summary="Get file details",
)
def get_file(
    file_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_authenticated_user),
) -> FileRead:
    return FileRead.model_validate(service.get_file(db, file_id, current_user.id))


@router.delete(
    "/{file_id}",
    summary="Delete a file (soft delete)",
)
def delete_file(
    file_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_authenticated_user),
) -> dict:
    service.delete_file(db, file_id, user_id=current_user.id)
    return {"success": True}


@router.post(
    "/{file_id}/download-url",
    response_model=FileDownloadUrlResponse,
    summary="Generate a time-limited download URL for a file",
)
def generate_download_url(
    file_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_authenticated_user),
) -> FileDownloadUrlResponse:
    url, expires_at = service.generate_download_url(db, file_id, user_id=current_user.id)
    return FileDownloadUrlResponse(download_url=url, expires_at=expires_at)
