"""AI chat endpoints with SSE streaming."""
from __future__ import annotations

from uuid import UUID

import structlog
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_current_user_bearer_or_query, get_db
from app.models.user import User
from app.schemas.ai import (
    AIAttachmentRead,
    AIConfigOut,
    ChatRequest,
    ConversationDetailOut,
    ConversationListOut,
    ConversationOut,
    MessageOut,
    SkillInfo,
)
from app.services import ai_attachment_service, ai_service
from app.services.ai_attachment_service import (
    AIAttachmentError,
    AIAttachmentNotFoundError,
    AIAttachmentPermissionError,
)
from app.services.agent import registry as skill_registry
from app.services.llm import is_llm_configured, is_embedding_configured, LLMConfigError
from app.services.storage_service import (
    ALLOWED_CONTENT_TYPES,
    MAX_FILE_SIZE,
    StorageUnavailableError,
)
from app.utils.file_responses import streaming_s3_response

logger = structlog.get_logger()

router = APIRouter(prefix="/ai", tags=["ai"])


def _attachment_to_read(attachment) -> AIAttachmentRead:
    return AIAttachmentRead.model_validate(attachment)


@router.get("/config", response_model=AIConfigOut)
async def get_ai_config():
    """Return AI configuration status. No authentication required."""
    from app.core.config import settings

    configured = is_llm_configured()
    emb_configured = is_embedding_configured()
    vision_enabled = configured and settings.LLM_VISION_ENABLED

    skills = [
        SkillInfo(name=s.name, description=s.description, category=s.category)
        for s in skill_registry.list_all()
    ]

    return AIConfigOut(
        is_configured=configured,
        provider=settings.LLM_PROVIDER or None if configured else None,
        model=settings.LLM_MODEL or None if configured else None,
        embedding_configured=emb_configured,
        embedding_provider=(settings.EMBEDDING_PROVIDER or settings.LLM_PROVIDER or None) if emb_configured else None,
        embedding_model=settings.EMBEDDING_MODEL or None if emb_configured else None,
        vision_enabled=vision_enabled,
        available_skills=skills,
    )


@router.post("/conversations", response_model=ConversationOut, status_code=status.HTTP_201_CREATED)
async def create_conversation(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create an empty conversation (for upload-on-select before first message)."""
    conversation = await ai_service.create_conversation(db, user.id)
    return ConversationOut(
        id=conversation.id,
        title=conversation.title,
        model=conversation.model,
        message_count=0,
        is_archived=conversation.is_archived,
        created_at=conversation.created_at,
        updated_at=conversation.updated_at,
    )


@router.post("/chat")
async def chat(
    body: ChatRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Send a message and receive SSE streaming response."""
    if not is_llm_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI is not configured. Set LLM_PROVIDER and LLM_MODEL environment variables.",
        )

    if body.conversation_id:
        conv = await ai_service.get_conversation(db, body.conversation_id, user.id)
        if conv is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found",
            )

    async def event_generator():
        try:
            async for event in ai_service.send_message_stream(
                db,
                user,
                body.conversation_id,
                body.message,
                attachment_ids=body.attachment_ids,
            ):
                yield event
        except LLMConfigError as exc:
            import json
            yield f"data: {json.dumps({'type': 'error', 'message': str(exc)})}\n\n"
        finally:
            await db.commit()

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/conversations", response_model=ConversationListOut)
async def list_conversations(
    offset: int = 0,
    limit: int = 20,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List the authenticated user's conversations."""
    limit = min(limit, 100)
    conversations, total = await ai_service.list_conversations(db, user.id, offset, limit)

    items = []
    for conv in conversations:
        items.append(ConversationOut(
            id=conv.id,
            title=conv.title,
            model=conv.model,
            message_count=getattr(conv, "_message_count", 0),
            is_archived=conv.is_archived,
            created_at=conv.created_at,
            updated_at=conv.updated_at,
        ))

    return ConversationListOut(items=items, total=total, offset=offset, limit=limit)


@router.get("/conversations/{conversation_id}", response_model=ConversationDetailOut)
async def get_conversation(
    conversation_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a conversation with all its messages."""
    conv = await ai_service.get_conversation(db, conversation_id, user.id)
    if conv is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )

    message_ids = [m.id for m in conv.messages]
    attachments_by_message = await ai_attachment_service.get_attachments_by_message_ids(
        db, message_ids,
    )

    messages = [
        MessageOut(
            id=m.id,
            role=m.role,
            content=m.content,
            model=m.model,
            prompt_tokens=m.prompt_tokens,
            completion_tokens=m.completion_tokens,
            tool_calls=m.tool_calls,
            created_at=m.created_at,
            attachments=[
                _attachment_to_read(a)
                for a in attachments_by_message.get(m.id, [])
            ],
        )
        for m in conv.messages
    ]

    return ConversationDetailOut(
        id=conv.id,
        title=conv.title,
        model=conv.model,
        message_count=len(conv.messages),
        is_archived=conv.is_archived,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        messages=messages,
    )


@router.delete("/conversations/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation(
    conversation_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a conversation and all its messages."""
    deleted = await ai_service.delete_conversation(db, conversation_id, user.id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )


@router.post(
    "/conversations/{conversation_id}/attachments",
    response_model=AIAttachmentRead,
    status_code=status.HTTP_201_CREATED,
)
async def upload_conversation_attachment(
    conversation_id: UUID,
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload a file to an AI conversation staging area."""
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

    try:
        attachment = await ai_attachment_service.upload_conversation_attachment(
            db,
            conversation_id=conversation_id,
            user_id=user.id,
            filename=file.filename,
            content_type=content_type,
            file_body=body,
        )
    except AIAttachmentPermissionError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    except AIAttachmentError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except StorageUnavailableError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="File storage is temporarily unavailable. Please try again later.",
        )

    return _attachment_to_read(attachment)


@router.get(
    "/conversations/{conversation_id}/attachments",
    response_model=list[AIAttachmentRead],
)
async def list_conversation_attachments(
    conversation_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List staging attachments for a conversation."""
    try:
        attachments = await ai_attachment_service.list_conversation_attachments(
            db, conversation_id, user.id,
        )
    except AIAttachmentPermissionError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")

    return [_attachment_to_read(a) for a in attachments]


@router.delete(
    "/conversations/{conversation_id}/attachments/{attachment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_conversation_attachment(
    conversation_id: UUID,
    attachment_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove an unpromoted staging attachment."""
    try:
        attachment = await ai_attachment_service.get_conversation_attachment(
            db, attachment_id, user.id,
        )
        if attachment.conversation_id != conversation_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attachment not found")
        await ai_attachment_service.delete_conversation_attachment(db, attachment_id, user.id)
    except AIAttachmentNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attachment not found")
    except AIAttachmentPermissionError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    except AIAttachmentError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except StorageUnavailableError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="File storage is temporarily unavailable. Please try again later.",
        )


@router.get("/conversations/{conversation_id}/attachments/{attachment_id}/download")
async def download_conversation_attachment(
    conversation_id: UUID,
    attachment_id: UUID,
    user: User = Depends(get_current_user_bearer_or_query),
    db: AsyncSession = Depends(get_db),
):
    """Download a conversation attachment (for UI thumbnails and previews)."""
    try:
        attachment = await ai_attachment_service.get_conversation_attachment(
            db, attachment_id, user.id,
        )
    except AIAttachmentNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attachment not found")
    except AIAttachmentPermissionError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")

    if attachment.conversation_id != conversation_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attachment not found")

    inline = attachment.content_type.startswith("image/")
    try:
        return await streaming_s3_response(
            attachment.s3_key,
            content_type=attachment.content_type,
            filename=attachment.filename,
            inline=inline,
        )
    except StorageUnavailableError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="File storage is temporarily unavailable. Please try again later.",
        )
