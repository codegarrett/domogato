from __future__ import annotations

from datetime import date, datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class EpicCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    description: str | None = None
    status: str | None = Field(None, pattern=r"^(open|in_progress|closed)$")
    color: str | None = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")
    start_date: date | None = None
    target_date: date | None = None


class EpicUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=500)
    description: str | None = None
    status: str | None = Field(None, pattern=r"^(open|in_progress|closed)$")
    color: str | None = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")
    start_date: date | None = None
    target_date: date | None = None


class EpicRead(BaseModel):
    id: UUID
    project_id: UUID
    title: str
    description: str | None = None
    status: str
    color: str
    start_date: date | None = None
    target_date: date | None = None
    sort_order: str
    created_by_id: UUID | None = None
    created_at: datetime
    updated_at: datetime
    ticket_count: int | None = None
    progress: dict[str, Any] | None = None

    model_config = {"from_attributes": True}
