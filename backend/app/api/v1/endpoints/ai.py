"""AI chat endpoints with SSE streaming."""
from __future__ import annotations

from uuid import UUID

import structlog
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.ai import (
    AIConfigOut,
    ChatRequest,
    ConversationDetailOut,
    ConversationListOut,
    ConversationOut,
    MessageOut,
    SkillInfo,
)
from app.services import ai_service
from app.services.agent import registry as skill_registry
from app.services.llm import is_llm_configured, is_embedding_configured, LLMConfigError

logger = structlog.get_logger()

router = APIRouter(prefix="/ai", tags=["ai"])


@router.get("/config", response_model=AIConfigOut)
async def get_ai_config():
    """Return AI configuration status. No authentication required."""
    from app.core.config import settings

    configured = is_llm_configured()
    emb_configured = is_embedding_configured()

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
        available_skills=skills,
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
                db, user, body.conversation_id, body.message
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

    return ConversationDetailOut(
        id=conv.id,
        title=conv.title,
        model=conv.model,
        message_count=len(conv.messages),
        is_archived=conv.is_archived,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        messages=[MessageOut.model_validate(m) for m in conv.messages],
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
