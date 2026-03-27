from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class CommentCreate(BaseModel):
    body: str = Field(..., min_length=1)


class CommentUpdate(BaseModel):
    body: str = Field(..., min_length=1)


class CommentRead(BaseModel):
    id: UUID
    ticket_id: UUID
    author_id: UUID | None = None
    body: str
    is_edited: bool
    is_deleted: bool
    created_at: datetime
    updated_at: datetime
    author_name: str | None = None
    author_email: str | None = None

    model_config = {"from_attributes": True}
