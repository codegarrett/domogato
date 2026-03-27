from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class DependencyCreate(BaseModel):
    blocked_ticket_id: UUID
    dependency_type: str = Field("blocks", pattern=r"^(blocks|blocked_by|relates_to)$")


class DependencyRead(BaseModel):
    id: UUID
    blocking_ticket_id: UUID
    blocked_ticket_id: UUID
    dependency_type: str
    created_at: datetime

    blocking_ticket_title: str | None = None
    blocking_ticket_key: str | None = None
    blocked_ticket_title: str | None = None
    blocked_ticket_key: str | None = None

    model_config = {"from_attributes": True}
