"""Schemas for agent skill management."""
from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class AgentSkillListItem(BaseModel):
    id: UUID
    slug: str
    name: str
    enabled: bool
    tool_name: str | None = None
    updated_at: datetime


class AgentSkillDetail(BaseModel):
    id: UUID
    slug: str
    name: str
    content_md: str
    enabled: bool
    tool_name: str | None = None
    description: str | None = None
    category: str | None = None
    updated_at: datetime


class AgentSkillUpsert(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    content_md: str = Field(..., min_length=10)
    enabled: bool = True


class AgentSkillValidateRequest(BaseModel):
    content_md: str = Field(..., min_length=10)


class AgentSkillValidateResponse(BaseModel):
    valid: bool
    tool_name: str | None = None
    description: str | None = None
    category: str | None = None
    errors: list[str] = Field(default_factory=list)


class AgentSkillGenerateRequest(BaseModel):
    prompt: str = Field(..., min_length=3, max_length=4000)
    current_content_md: str | None = None
    display_name: str | None = Field(None, max_length=255)


class AgentSkillGenerateResponse(BaseModel):
    content_md: str
    suggested_name: str | None = None
    valid: bool
    tool_name: str | None = None
    errors: list[str] = Field(default_factory=list)


class AgentSecretsRead(BaseModel):
    keys: list[str]


class AgentSecretSet(BaseModel):
    key: str = Field(..., min_length=1, max_length=100, pattern=r"^[A-Z][A-Z0-9_]{0,99}$")
    value: str = Field(..., min_length=1, max_length=2000)


class AgentSecretDelete(BaseModel):
    key: str = Field(..., min_length=1, max_length=100, pattern=r"^[A-Z][A-Z0-9_]{0,99}$")


class AgentSecretValue(BaseModel):
    key: str
    value: str
