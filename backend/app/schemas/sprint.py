from __future__ import annotations

from datetime import date, datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class SprintCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    goal: str | None = None
    start_date: date | None = None
    end_date: date | None = None


class SprintUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    goal: str | None = None
    start_date: date | None = None
    end_date: date | None = None


class SprintRead(BaseModel):
    id: UUID
    project_id: UUID
    name: str
    goal: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    status: str
    completed_at: datetime | None = None
    velocity: int | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class SprintStats(BaseModel):
    sprint: SprintRead
    total_tickets: int = 0
    completed_tickets: int = 0
    total_story_points: int = 0
    completed_story_points: int = 0


class SprintCompleteRequest(BaseModel):
    move_incomplete_to: str = Field(
        "backlog",
        description="'backlog' or a sprint UUID to move incomplete tickets to",
    )


class BacklogReorderRequest(BaseModel):
    ticket_ids: list[UUID]


class BacklogMoveToSprintRequest(BaseModel):
    ticket_ids: list[UUID]
    sprint_id: UUID
