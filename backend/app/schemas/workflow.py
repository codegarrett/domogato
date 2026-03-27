from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class WorkflowStatusCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    category: str = Field("to_do", pattern=r"^(to_do|in_progress|done)$")
    color: str = Field("#6B7280", pattern=r"^#[0-9A-Fa-f]{6}$")
    position: int = Field(0, ge=0)
    is_initial: bool = False
    is_terminal: bool = False


class WorkflowStatusRead(BaseModel):
    id: UUID
    workflow_id: UUID
    name: str
    category: str
    color: str
    position: int
    is_initial: bool
    is_terminal: bool
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


class WorkflowStatusUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=100)
    category: str | None = Field(None, pattern=r"^(to_do|in_progress|done)$")
    color: str | None = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")
    position: int | None = Field(None, ge=0)
    is_initial: bool | None = None
    is_terminal: bool | None = None


class WorkflowTransitionCreate(BaseModel):
    from_status_id: UUID
    to_status_id: UUID
    name: str | None = None
    conditions: dict[str, Any] = Field(default_factory=dict)


class WorkflowTransitionRead(BaseModel):
    id: UUID
    workflow_id: UUID
    from_status_id: UUID
    to_status_id: UUID
    name: str | None
    conditions: dict[str, Any]
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


class WorkflowCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    template_id: UUID | None = None


class WorkflowRead(BaseModel):
    id: UUID
    organization_id: UUID
    name: str
    description: str | None
    is_template: bool
    is_active: bool
    statuses: list[WorkflowStatusRead] = []
    transitions: list[WorkflowTransitionRead] = []
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


class WorkflowUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    is_active: bool | None = None
