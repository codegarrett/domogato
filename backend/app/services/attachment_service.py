"""Service layer for file attachment CRUD operations."""
from __future__ import annotations

from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.attachment import Attachment
from app.services import storage_service


async def create_attachment(
    db: AsyncSession,
    *,
    ticket_id: UUID,
    project_id: UUID,
    uploaded_by_id: UUID | None,
    filename: str,
    content_type: str,
    file_body: bytes,
) -> Attachment:
    """Create an attachment record and store the file in S3."""
    s3_key = storage_service.generate_s3_key(str(project_id), filename)

    await storage_service.put_object(s3_key, file_body, content_type)

    attachment = Attachment(
        ticket_id=ticket_id,
        project_id=project_id,
        uploaded_by_id=uploaded_by_id,
        filename=filename,
        content_type=content_type,
        size_bytes=len(file_body),
        s3_key=s3_key,
    )
    db.add(attachment)
    await db.flush()
    await db.refresh(attachment)
    return attachment


async def list_attachments(
    db: AsyncSession,
    ticket_id: UUID,
    offset: int = 0,
    limit: int = 50,
) -> tuple[list[Attachment], int]:
    total_q = await db.execute(
        select(func.count()).select_from(Attachment).where(Attachment.ticket_id == ticket_id)
    )
    total = total_q.scalar() or 0

    q = (
        select(Attachment)
        .where(Attachment.ticket_id == ticket_id)
        .order_by(Attachment.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    result = await db.execute(q)
    return list(result.scalars().all()), total


async def get_attachment(db: AsyncSession, attachment_id: UUID) -> Attachment | None:
    result = await db.execute(
        select(Attachment).where(Attachment.id == attachment_id)
    )
    return result.scalar_one_or_none()


async def delete_attachment(db: AsyncSession, attachment_id: UUID) -> bool:
    attachment = await get_attachment(db, attachment_id)
    if attachment is None:
        return False
    await storage_service.delete_object(attachment.s3_key)
    await db.delete(attachment)
    await db.flush()
    return True
