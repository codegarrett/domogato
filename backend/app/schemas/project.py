from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, examples=["Backend API"])
    key: str = Field(..., min_length=2, max_length=10, pattern=r"^[A-Z][A-Z0-9](?:[A-Z0-9-]*[A-Z0-9])?$", examples=["API"])
    description: str | None = Field(None, examples=["Core backend API service"])
    visibility: str = Field("private", pattern=r"^(private|internal|public)$", examples=["internal"])
    settings: dict[str, Any] = Field(default_factory=dict)

    model_config = {"json_schema_extra": {"examples": [{"name": "Backend API", "key": "API", "description": "Core backend API service", "visibility": "internal"}]}}


class ProjectUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    avatar_url: str | None = None
    visibility: str | None = Field(None, pattern=r"^(private|internal|public)$")
    default_workflow_id: UUID | None = None
    settings: dict[str, Any] | None = None


class ProjectRead(BaseModel):
    id: UUID
    organization_id: UUID
    name: str
    key: str
    description: str | None = None
    avatar_url: str | None = None
    visibility: str
    default_workflow_id: UUID | None = None
    ticket_sequence: int
    settings: dict[str, Any] = Field(default_factory=dict)
    is_archived: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ProjectMemberCreate(BaseModel):
    user_id: UUID
    role: str = Field("developer", pattern=r"^(owner|maintainer|developer|reporter|guest)$")


class ProjectMemberUpdate(BaseModel):
    role: str = Field(..., pattern=r"^(owner|maintainer|developer|reporter|guest)$")


class ProjectMemberRead(BaseModel):
    id: UUID
    user_id: UUID
    email: str
    display_name: str
    avatar_url: str | None = None
    role: str
    created_at: datetime

    model_config = {"from_attributes": True}
