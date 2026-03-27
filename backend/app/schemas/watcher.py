from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class WatcherAdd(BaseModel):
    user_id: UUID


class WatcherRead(BaseModel):
    user_id: UUID
    display_name: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}
