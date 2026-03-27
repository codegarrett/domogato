from __future__ import annotations

from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, Field


class TimeLogCreate(BaseModel):
    seconds_spent: int = Field(..., gt=0, description="Time spent in seconds")
    work_date: date = Field(...)
    description: str | None = None
    activity_type: str = "general"


class TimeLogUpdate(BaseModel):
    seconds_spent: int | None = Field(None, gt=0)
    work_date: date | None = None
    description: str | None = None
    activity_type: str | None = None


class TimeLogRead(BaseModel):
    id: UUID
    ticket_id: UUID
    project_id: UUID
    user_id: UUID
    seconds_spent: int
    work_date: date
    description: str | None = None
    activity_type: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TimeReport(BaseModel):
    total_seconds: int = 0
    entries: list[TimeLogRead] = Field(default_factory=list)


class TimesheetEntry(BaseModel):
    date: date
    total_seconds: int
    entries: list[TimeLogRead] = Field(default_factory=list)


class TimesheetReport(BaseModel):
    user_id: UUID
    start_date: date
    end_date: date
    total_seconds: int = 0
    days: list[TimesheetEntry] = Field(default_factory=list)
