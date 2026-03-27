from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class AttachmentCreate(BaseModel):
    filename: str = Field(..., max_length=255, min_length=1)
    content_type: str = Field(..., max_length=127)
    size_bytes: int = Field(..., gt=0, le=100 * 1024 * 1024)


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


class AttachmentPresignResponse(BaseModel):
    attachment: AttachmentRead
    upload_url: str


class AttachmentDownloadResponse(BaseModel):
    download_url: str
