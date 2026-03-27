from __future__ import annotations

from datetime import date
from uuid import UUID

from pydantic import BaseModel, Field


class BurndownPoint(BaseModel):
    date: date
    remaining: float
    ideal: float


class BurndownReport(BaseModel):
    sprint_id: UUID
    points: list[BurndownPoint] = Field(default_factory=list)


class VelocityEntry(BaseModel):
    sprint_id: UUID
    sprint_name: str
    velocity: float


class VelocityReport(BaseModel):
    entries: list[VelocityEntry] = Field(default_factory=list)
    average: float = 0


class CfdDay(BaseModel):
    date: date
    todo: int = 0
    in_progress: int = 0
    done: int = 0


class CumulativeFlowReport(BaseModel):
    project_id: UUID
    days: list[CfdDay] = Field(default_factory=list)


class CycleTimeEntry(BaseModel):
    ticket_id: UUID
    ticket_key: str | None = None
    title: str
    cycle_time_hours: float


class CycleTimeReport(BaseModel):
    entries: list[CycleTimeEntry] = Field(default_factory=list)
    average_hours: float = 0
    median_hours: float = 0


class SprintReportTicket(BaseModel):
    ticket_id: UUID
    ticket_key: str | None = None
    title: str
    story_points: int = 0
    completed: bool = False
    priority: str = "medium"
    ticket_type: str = "task"


class SprintReportSummary(BaseModel):
    total_tickets: int = 0
    completed_tickets: int = 0
    incomplete_tickets: int = 0
    total_story_points: int = 0
    completed_story_points: int = 0
    incomplete_story_points: int = 0
    completion_rate: float = 0


class SprintReport(BaseModel):
    sprint_id: UUID
    sprint_name: str = ""
    status: str = "planning"
    start_date: date | None = None
    end_date: date | None = None
    summary: SprintReportSummary = Field(default_factory=SprintReportSummary)
    tickets: list[SprintReportTicket] = Field(default_factory=list)


class ProjectSummary(BaseModel):
    total_tickets: int = 0
    open_tickets: int = 0
    in_progress_tickets: int = 0
    done_tickets: int = 0
    overdue_tickets: int = 0
    total_story_points: int = 0
    completed_story_points: int = 0
    by_priority: dict[str, int] = Field(default_factory=dict)
    by_type: dict[str, int] = Field(default_factory=dict)
