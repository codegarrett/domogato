"""AI conversation attachment staging — upload, link, promote to tickets/issue reports."""
from __future__ import annotations

import uuid
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import events
from app.core.permissions import ProjectRole
from app.models.ai_conversation import AIConversation
from app.models.ai_conversation_attachment import AIConversationAttachment
from app.models.issue_report import IssueReport
from app.models.user import User
from app.services import attachment_service, issue_report_service
from app.services.agent.skills import check_project_access, resolve_ticket
from app.services.storage_service import (
    ALLOWED_CONTENT_TYPES,
    MAX_FILE_SIZE,
    StorageUnavailableError,
    delete_object,
    get_object_bytes,
    put_object,
)


class AIAttachmentError(Exception):
    """Base error for AI attachment operations."""


class AIAttachmentNotFoundError(AIAttachmentError):
    pass


class AIAttachmentPermissionError(AIAttachmentError):
    pass


def generate_staging_s3_key(conversation_id: UUID, filename: str) -> str:
    safe_name = filename.replace("/", "_").replace("\\", "_")
    unique = uuid.uuid4().hex[:12]
    return f"ai-conversations/{conversation_id}/{unique}_{safe_name}"


async def _get_conversation_for_user(
    db: AsyncSession, conversation_id: UUID, user_id: UUID,
) -> AIConversation:
    result = await db.execute(
        select(AIConversation).where(
            AIConversation.id == conversation_id,
            AIConversation.user_id == user_id,
        )
    )
    conv = result.scalar_one_or_none()
    if conv is None:
        raise AIAttachmentPermissionError("Conversation not found")
    return conv


async def upload_conversation_attachment(
    db: AsyncSession,
    *,
    conversation_id: UUID,
    user_id: UUID,
    filename: str,
    content_type: str,
    file_body: bytes,
) -> AIConversationAttachment:
    await _get_conversation_for_user(db, conversation_id, user_id)

    if content_type not in ALLOWED_CONTENT_TYPES:
        raise AIAttachmentError(f"Content type '{content_type}' is not allowed")
    if len(file_body) == 0:
        raise AIAttachmentError("Empty file")
    if len(file_body) > MAX_FILE_SIZE:
        raise AIAttachmentError(f"File exceeds maximum size of {MAX_FILE_SIZE} bytes")

    s3_key = generate_staging_s3_key(conversation_id, filename)
    await put_object(s3_key, file_body, content_type)

    attachment = AIConversationAttachment(
        conversation_id=conversation_id,
        user_id=user_id,
        filename=filename,
        content_type=content_type,
        size_bytes=len(file_body),
        s3_key=s3_key,
    )
    db.add(attachment)
    await db.flush()
    await db.refresh(attachment)
    return attachment


async def list_conversation_attachments(
    db: AsyncSession,
    conversation_id: UUID,
    user_id: UUID,
) -> list[AIConversationAttachment]:
    await _get_conversation_for_user(db, conversation_id, user_id)
    result = await db.execute(
        select(AIConversationAttachment)
        .where(AIConversationAttachment.conversation_id == conversation_id)
        .order_by(AIConversationAttachment.created_at.asc())
    )
    return list(result.scalars().all())


async def get_conversation_attachment(
    db: AsyncSession,
    attachment_id: UUID,
    user_id: UUID,
) -> AIConversationAttachment:
    result = await db.execute(
        select(AIConversationAttachment).where(
            AIConversationAttachment.id == attachment_id,
        )
    )
    attachment = result.scalar_one_or_none()
    if attachment is None:
        raise AIAttachmentNotFoundError("Attachment not found")
    await _get_conversation_for_user(db, attachment.conversation_id, user_id)
    return attachment


async def delete_conversation_attachment(
    db: AsyncSession,
    attachment_id: UUID,
    user_id: UUID,
) -> bool:
    attachment = await get_conversation_attachment(db, attachment_id, user_id)
    if attachment.promoted_to_type is not None:
        raise AIAttachmentError("Cannot delete an attachment that has been promoted")
    await delete_object(attachment.s3_key)
    await db.delete(attachment)
    await db.flush()
    return True


async def delete_all_conversation_attachments(
    db: AsyncSession,
    conversation_id: UUID,
) -> None:
    result = await db.execute(
        select(AIConversationAttachment).where(
            AIConversationAttachment.conversation_id == conversation_id,
        )
    )
    for attachment in result.scalars().all():
        try:
            await delete_object(attachment.s3_key)
        except StorageUnavailableError:
            pass
        await db.delete(attachment)
    await db.flush()


async def link_attachments_to_message(
    db: AsyncSession,
    *,
    attachment_ids: list[UUID],
    message_id: UUID,
    conversation_id: UUID,
    user_id: UUID,
) -> list[AIConversationAttachment]:
    if not attachment_ids:
        return []

    await _get_conversation_for_user(db, conversation_id, user_id)
    result = await db.execute(
        select(AIConversationAttachment).where(
            AIConversationAttachment.id.in_(attachment_ids),
            AIConversationAttachment.conversation_id == conversation_id,
        )
    )
    attachments = list(result.scalars().all())
    if len(attachments) != len(attachment_ids):
        raise AIAttachmentError("One or more attachments not found in this conversation")

    for attachment in attachments:
        attachment.message_id = message_id
    await db.flush()
    return attachments


async def get_attachments_for_message(
    db: AsyncSession,
    message_id: UUID,
) -> list[AIConversationAttachment]:
    result = await db.execute(
        select(AIConversationAttachment)
        .where(AIConversationAttachment.message_id == message_id)
        .order_by(AIConversationAttachment.created_at.asc())
    )
    return list(result.scalars().all())


async def get_attachments_by_message_ids(
    db: AsyncSession,
    message_ids: list[UUID],
) -> dict[UUID, list[AIConversationAttachment]]:
    if not message_ids:
        return {}
    result = await db.execute(
        select(AIConversationAttachment)
        .where(AIConversationAttachment.message_id.in_(message_ids))
        .order_by(AIConversationAttachment.created_at.asc())
    )
    grouped: dict[UUID, list[AIConversationAttachment]] = {}
    for attachment in result.scalars().all():
        if attachment.message_id is None:
            continue
        grouped.setdefault(attachment.message_id, []).append(attachment)
    return grouped


def format_attachment_summary(attachments: list[AIConversationAttachment]) -> str:
    if not attachments:
        return ""
    parts = [
        f"{a.filename} ({a.content_type}, id={a.id})"
        for a in attachments
    ]
    return "[Attached files: " + ", ".join(parts) + "]"


async def _get_promotable_attachment(
    db: AsyncSession,
    *,
    attachment_id: UUID,
    conversation_id: UUID | None,
    user_id: UUID,
) -> AIConversationAttachment:
    if conversation_id is None:
        raise AIAttachmentError("No active conversation for file operation")

    result = await db.execute(
        select(AIConversationAttachment).where(
            AIConversationAttachment.id == attachment_id,
            AIConversationAttachment.conversation_id == conversation_id,
        )
    )
    attachment = result.scalar_one_or_none()
    if attachment is None:
        raise AIAttachmentNotFoundError("Attachment not found in this conversation")
    await _get_conversation_for_user(db, attachment.conversation_id, user_id)
    if attachment.promoted_to_type is not None:
        raise AIAttachmentError("Attachment has already been promoted")
    return attachment


async def promote_to_ticket(
    db: AsyncSession,
    *,
    attachment_id: UUID,
    conversation_id: UUID | None,
    user: User,
    project_key: str,
    ticket_number: int,
) -> dict:
    attachment = await _get_promotable_attachment(
        db,
        attachment_id=attachment_id,
        conversation_id=conversation_id,
        user_id=user.id,
    )
    project = await check_project_access(
        db, user, project_key, min_role=ProjectRole.DEVELOPER,
    )
    ticket = await resolve_ticket(db, project, ticket_number)
    if ticket is None:
        raise AIAttachmentError(f"Ticket {project.key}-{ticket_number} not found")

    stored = await get_object_bytes(attachment.s3_key)
    created = await attachment_service.create_attachment(
        db,
        ticket_id=ticket.id,
        project_id=project.id,
        uploaded_by_id=user.id,
        filename=attachment.filename,
        content_type=attachment.content_type,
        file_body=stored.body,
    )

    attachment.promoted_to_type = "ticket"
    attachment.promoted_to_id = created.id
    await db.flush()

    await events.publish(
        events.EVENT_ATTACHMENT_ADDED,
        ticket_id=str(ticket.id),
        project_id=str(project.id),
        attachment_id=str(created.id),
        filename=created.filename,
        actor_id=str(user.id),
        actor_name=user.display_name,
    )

    return {
        "promoted": True,
        "attachment_id": str(attachment.id),
        "ticket_key": f"{project.key}-{ticket.ticket_number}",
        "ticket_attachment_id": str(created.id),
        "filename": attachment.filename,
        "message": f"Attached '{attachment.filename}' to {project.key}-{ticket.ticket_number}.",
    }


async def promote_to_issue_report(
    db: AsyncSession,
    *,
    attachment_id: UUID,
    conversation_id: UUID | None,
    user: User,
    project_key: str,
    report_id: UUID,
) -> dict:
    attachment = await _get_promotable_attachment(
        db,
        attachment_id=attachment_id,
        conversation_id=conversation_id,
        user_id=user.id,
    )
    project = await check_project_access(db, user, project_key)
    report = await issue_report_service.get_issue_report(db, report_id)
    if report is None or report.project_id != project.id:
        raise AIAttachmentError(f"Issue report '{report_id}' not found in project {project.key}")

    stored = await get_object_bytes(attachment.s3_key)
    created = await issue_report_service.create_issue_report_attachment(
        db,
        issue_report_id=report_id,
        project_id=project.id,
        uploaded_by_id=user.id,
        filename=attachment.filename,
        content_type=attachment.content_type,
        file_body=stored.body,
    )

    attachment.promoted_to_type = "issue_report"
    attachment.promoted_to_id = created.id
    await db.flush()

    return {
        "promoted": True,
        "attachment_id": str(attachment.id),
        "report_id": str(report_id),
        "issue_report_attachment_id": str(created.id),
        "filename": attachment.filename,
        "message": f"Attached '{attachment.filename}' to issue report '{report.title}'.",
    }
