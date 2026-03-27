from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class NotificationRead(BaseModel):
    id: UUID
    user_id: UUID
    event_type: str
    title: str
    body: str | None = None
    entity_type: str | None = None
    entity_id: UUID | None = None
    data: dict[str, Any] = Field(default_factory=dict)
    is_read: bool
    read_at: datetime | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class NotificationCountRead(BaseModel):
    unread_count: int
