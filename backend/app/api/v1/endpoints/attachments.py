from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_current_user_bearer_or_query, get_db
from app.core import events
from app.core.permissions import (
    PROJECT_ROLE_HIERARCHY,
    ProjectRole,
    resolve_effective_project_role,
)
from app.models.user import User
from app.schemas.attachment import AttachmentRead
from app.schemas.common import PaginatedResponse
from app.services import attachment_service, project_service, ticket_service
from app.services.storage_service import (
    ALLOWED_CONTENT_TYPES,
    MAX_FILE_SIZE,
    StorageUnavailableError,
)
from app.utils.file_responses import streaming_s3_response

router = APIRouter(tags=["attachments"])


async def _require_project_role_via_ticket(
    db: AsyncSession, ticket_id: UUID, user: User, minimum: ProjectRole,
) -> None:
    if user.is_system_admin:
        return
    ticket = await ticket_service.get_ticket(db, ticket_id)
    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")
    project = await project_service.get_project(db, ticket.project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    effective = await resolve_effective_project_role(
        user_id=user.id,
        project_id=ticket.project_id,
        organization_id=project.organization_id,
        project_visibility=project.visibility,
        is_system_admin=user.is_system_admin,
        db=db,
    )
    if effective is None or PROJECT_ROLE_HIERARCHY[effective] < PROJECT_ROLE_HIERARCHY[minimum]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")


@router.post(
    "/tickets/{ticket_id}/attachments",
    response_model=AttachmentRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_attachment(
    ticket_id: UUID,
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_project_role_via_ticket(db, ticket_id, user, ProjectRole.DEVELOPER)

    if not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Filename is required")

    content_type = file.content_type or "application/octet-stream"
    if content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Content type '{content_type}' is not allowed",
        )

    body = await file.read()
    if len(body) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty file")
    if len(body) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum size of {MAX_FILE_SIZE} bytes",
        )

    ticket = await ticket_service.get_ticket(db, ticket_id)
    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")

    try:
        attachment = await attachment_service.create_attachment(
            db,
            ticket_id=ticket_id,
            project_id=ticket.project_id,
            uploaded_by_id=user.id,
            filename=file.filename,
            content_type=content_type,
            file_body=body,
        )
    except StorageUnavailableError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="File storage is temporarily unavailable. Please try again later.",
        )

    await events.publish(
        events.EVENT_ATTACHMENT_ADDED,
        ticket_id=str(ticket_id),
        project_id=str(ticket.project_id),
        attachment_id=str(attachment.id),
        filename=attachment.filename,
        actor_id=str(user.id),
        actor_name=user.display_name,
    )

    return AttachmentRead.model_validate(attachment)


@router.get(
    "/tickets/{ticket_id}/attachments",
    response_model=PaginatedResponse[AttachmentRead],
)
async def list_attachments(
    ticket_id: UUID,
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_project_role_via_ticket(db, ticket_id, user, ProjectRole.GUEST)
    attachments, total = await attachment_service.list_attachments(
        db, ticket_id, offset=offset, limit=limit,
    )
    return PaginatedResponse(
        items=[AttachmentRead.model_validate(a) for a in attachments],
        total=total,
        offset=offset,
        limit=limit,
    )


@router.get("/attachments/{attachment_id}/download")
async def download_attachment(
    attachment_id: UUID,
    user: User = Depends(get_current_user_bearer_or_query),
    db: AsyncSession = Depends(get_db),
):
    attachment = await attachment_service.get_attachment(db, attachment_id)
    if attachment is None:
        raise HTTPException(status_code=404, detail="Attachment not found")

    await _require_project_role_via_ticket(db, attachment.ticket_id, user, ProjectRole.GUEST)

    try:
        return await streaming_s3_response(
            attachment.s3_key,
            content_type=attachment.content_type,
            filename=attachment.filename,
        )
    except StorageUnavailableError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="File storage is temporarily unavailable. Please try again later.",
        )


@router.delete(
    "/attachments/{attachment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_attachment(
    attachment_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    attachment = await attachment_service.get_attachment(db, attachment_id)
    if attachment is None:
        raise HTTPException(status_code=404, detail="Attachment not found")

    await _require_project_role_via_ticket(db, attachment.ticket_id, user, ProjectRole.MAINTAINER)

    deleted = await attachment_service.delete_attachment(db, attachment_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Attachment not found")

    await events.publish(
        events.EVENT_ATTACHMENT_DELETED,
        ticket_id=str(attachment.ticket_id),
        project_id=str(attachment.project_id),
        attachment_id=str(attachment_id),
        actor_id=str(user.id),
        actor_name=user.display_name,
    )
