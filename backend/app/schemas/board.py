from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class BoardColumnCreate(BaseModel):
    workflow_status_id: UUID
    wip_limit: int | None = None


class BoardColumnRead(BaseModel):
    id: UUID
    board_id: UUID
    workflow_status_id: UUID
    position: int
    wip_limit: int | None = None
    is_collapsed: bool = False

    model_config = {"from_attributes": True}


class BoardColumnUpdate(BaseModel):
    wip_limit: int | None = None
    is_collapsed: bool | None = None


class BoardCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    board_type: str = "kanban"


class BoardRead(BaseModel):
    id: UUID
    project_id: UUID
    name: str
    board_type: str
    filter_config: dict[str, Any] = Field(default_factory=dict)
    is_default: bool
    columns: list[BoardColumnRead] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class BoardUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    filter_config: dict[str, Any] | None = None


class MoveTicketRequest(BaseModel):
    to_status_id: UUID
    board_rank: str = "m"
