"""Pydantic schemas for AI chat endpoints."""
from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    conversation_id: UUID | None = None
    message: str = Field(..., min_length=1, max_length=32000)


class SkillInfo(BaseModel):
    name: str
    description: str
    category: str


class AIConfigOut(BaseModel):
    is_configured: bool
    provider: str | None = None
    model: str | None = None
    embedding_configured: bool = False
    embedding_provider: str | None = None
    embedding_model: str | None = None
    available_skills: list[SkillInfo] = []


class MessageOut(BaseModel):
    id: UUID
    role: str
    content: str
    model: str | None = None
    prompt_tokens: int | None = None
    completion_tokens: int | None = None
    tool_calls: dict | list | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ConversationOut(BaseModel):
    id: UUID
    title: str | None = None
    model: str | None = None
    message_count: int = 0
    is_archived: bool = False
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ConversationDetailOut(ConversationOut):
    messages: list[MessageOut] = []


class ConversationListOut(BaseModel):
    items: list[ConversationOut]
    total: int
    offset: int
    limit: int
