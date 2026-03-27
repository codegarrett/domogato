from __future__ import annotations

import re
import uuid as _uuid
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.core.permissions import (
    PROJECT_ROLE_HIERARCHY,
    ProjectRole,
    resolve_effective_project_role,
)
from app.models.kb_attachment import KBPageAttachment
from app.models.kb_page import KBPage
from app.models.project import Project
from app.models.user import User
from app.schemas.kb import (
    KBAttachmentCreate,
    KBAttachmentDownloadResponse,
    KBAttachmentPresignResponse,
    KBAttachmentRead,
)
from app.services import kb_service
from app.tasks.embedding_tasks import embed_kb_attachment
from app.services.storage_service import (
    StorageUnavailableError,
    generate_download_presign,
    generate_upload_presign,
)

router = APIRouter(tags=["knowledge-base"])


def _kb_s3_key(
    project_id: UUID, space_id: UUID, page_id: UUID, filename: str,
) -> str:
    safe = re.sub(r"[^a-zA-Z0-9._-]", "_", filename)
    return f"projects/{project_id}/kb/{space_id}/{page_id}/{_uuid.uuid4().hex[:8]}_{safe}"


async def _require_page_role(
    db: AsyncSession, page: KBPage, user: User, min_role: ProjectRole,
) -> ProjectRole:
    if user.is_system_admin:
        return ProjectRole.OWNER
    space = await kb_service.get_space_by_id(db, page.space_id)
    if space is None:
        raise HTTPException(status_code=404, detail="Space not found")
    result = await db.execute(select(Project).where(Project.id == space.project_id))
    project = result.scalar_one_or_none()
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    effective = await resolve_effective_project_role(
        user_id=user.id,
        project_id=space.project_id,
        organization_id=project.organization_id,
        project_visibility=project.visibility,
        is_system_admin=user.is_system_admin,
        db=db,
    )
    if effective is None or PROJECT_ROLE_HIERARCHY[effective] < PROJECT_ROLE_HIERARCHY[min_role]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions",
        )
    return effective


async def _get_page_or_404(db: AsyncSession, page_id: UUID) -> KBPage:
    page = await kb_service.get_page(db, page_id)
    if page is None or page.is_deleted:
        raise HTTPException(status_code=404, detail="Page not found")
    return page


async def _resolve_project_id(db: AsyncSession, page: KBPage) -> tuple[UUID, UUID]:
    """Return (project_id, space_id) for a page."""
    space = await kb_service.get_space_by_id(db, page.space_id)
    if space is None:
        raise HTTPException(status_code=404, detail="Space not found")
    return space.project_id, space.id


@router.post(
    "/kb/pages/{page_id}/attachments",
    response_model=KBAttachmentPresignResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_attachment(
    page_id: UUID,
    body: KBAttachmentCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    page = await _get_page_or_404(db, page_id)
    await _require_page_role(db, page, user, ProjectRole.DEVELOPER)

    project_id, space_id = await _resolve_project_id(db, page)
    s3_key = _kb_s3_key(project_id, space_id, page_id, body.filename)

    attachment = KBPageAttachment(
        page_id=page_id,
        filename=body.filename,
        content_type=body.content_type,
        size_bytes=body.size_bytes,
        s3_key=s3_key,
        created_by=user.id,
    )
    db.add(attachment)
    await db.flush()
    await db.refresh(attachment)

    try:
        upload_url = await generate_upload_presign(s3_key, body.content_type)
    except StorageUnavailableError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="File storage is temporarily unavailable. Please try again later.",
        )

    embed_kb_attachment.apply_async(
        args=[str(attachment.id), str(page_id)],
        countdown=10,
    )

    return KBAttachmentPresignResponse(
        attachment=KBAttachmentRead.model_validate(attachment),
        upload_url=upload_url,
    )


@router.get(
    "/kb/pages/{page_id}/attachments",
    response_model=list[KBAttachmentRead],
)
async def list_attachments(
    page_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    page = await _get_page_or_404(db, page_id)
    await _require_page_role(db, page, user, ProjectRole.GUEST)

    result = await db.execute(
        select(KBPageAttachment)
        .where(KBPageAttachment.page_id == page_id)
        .order_by(KBPageAttachment.created_at.desc())
    )
    attachments = result.scalars().all()
    return [KBAttachmentRead.model_validate(a) for a in attachments]


@router.get(
    "/kb/attachments/{attachment_id}/download",
    response_model=KBAttachmentDownloadResponse,
)
async def download_attachment(
    attachment_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(KBPageAttachment).where(KBPageAttachment.id == attachment_id)
    )
    attachment = result.scalar_one_or_none()
    if attachment is None:
        raise HTTPException(status_code=404, detail="Attachment not found")

    page = await _get_page_or_404(db, attachment.page_id)
    await _require_page_role(db, page, user, ProjectRole.GUEST)

    try:
        download_url = await generate_download_presign(
            attachment.s3_key, attachment.filename,
        )
    except StorageUnavailableError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="File storage is temporarily unavailable. Please try again later.",
        )
    return KBAttachmentDownloadResponse(download_url=download_url)


@router.delete(
    "/kb/attachments/{attachment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_attachment(
    attachment_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(KBPageAttachment).where(KBPageAttachment.id == attachment_id)
    )
    attachment = result.scalar_one_or_none()
    if attachment is None:
        raise HTTPException(status_code=404, detail="Attachment not found")

    page = await _get_page_or_404(db, attachment.page_id)
    effective = await _require_page_role(db, page, user, ProjectRole.DEVELOPER)

    is_owner = attachment.created_by == user.id
    is_maintainer = PROJECT_ROLE_HIERARCHY[effective] >= PROJECT_ROLE_HIERARCHY[ProjectRole.MAINTAINER]
    if not is_owner and not is_maintainer:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to delete this attachment",
        )

    await db.delete(attachment)
    await db.flush()
