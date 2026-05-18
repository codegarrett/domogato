from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class AttachmentRead(BaseModel):
    id: UUID
    ticket_id: UUID
    project_id: UUID
    uploaded_by_id: UUID | None = None
    filename: str
    content_type: str
    size_bytes: int
    created_at: datetime

    model_config = {"from_attributes": True}
