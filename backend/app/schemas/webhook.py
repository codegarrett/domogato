from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class WebhookCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    url: str = Field(..., min_length=1)
    secret: str | None = None
    events: list[str] = Field(default_factory=list)


class WebhookUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    url: str | None = None
    secret: str | None = None
    events: list[str] | None = None
    is_active: bool | None = None


class WebhookRead(BaseModel):
    id: UUID
    project_id: UUID
    name: str
    url: str
    events: list[str]
    is_active: bool
    consecutive_failures: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class WebhookDeliveryRead(BaseModel):
    id: UUID
    webhook_id: UUID
    event_type: str
    payload: dict[str, Any]
    response_status: int | None = None
    response_body: str | None = None
    duration_ms: int | None = None
    success: bool
    attempt: int
    error_message: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class WebhookTestRequest(BaseModel):
    event_type: str = "test"
