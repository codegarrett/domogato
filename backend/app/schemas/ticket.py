from __future__ import annotations

from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, Field, computed_field


class TicketCreate(BaseModel):
    project_id: UUID | None = None
    title: str = Field(..., min_length=1, max_length=500, examples=["Implement user authentication"])
    description: str | None = Field(None, examples=["Add JWT-based authentication flow"])
    ticket_type: str = Field("task", pattern=r"^(task|bug|story|epic|subtask)$", examples=["story"])
    priority: str = Field("medium", pattern=r"^(lowest|low|medium|high|highest)$", examples=["high"])
    assignee_id: UUID | None = None
    epic_id: UUID | None = None
    story_points: int | None = Field(None, ge=0, examples=[5])
    due_date: date | None = None
    start_date: date | None = None
    parent_ticket_id: UUID | None = None

    model_config = {"json_schema_extra": {"examples": [{"title": "Implement user authentication", "ticket_type": "story", "priority": "high", "story_points": 5}]}}


class TicketUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=500)
    description: str | None = None
    ticket_type: str | None = Field(None, pattern=r"^(task|bug|story|epic|subtask)$")
    priority: str | None = Field(None, pattern=r"^(lowest|low|medium|high|highest)$")
    assignee_id: UUID | None = None
    epic_id: UUID | None = None
    sprint_id: UUID | None = None
    story_points: int | None = Field(None, ge=0)
    due_date: date | None = None
    start_date: date | None = None
    resolution: str | None = None
    original_estimate_seconds: int | None = Field(None, ge=0)
    remaining_estimate_seconds: int | None = Field(None, ge=0)


class TicketRead(BaseModel):
    id: UUID
    project_id: UUID
    epic_id: UUID | None = None
    sprint_id: UUID | None = None
    parent_ticket_id: UUID | None = None
    ticket_number: int
    ticket_type: str
    title: str
    description: str | None = None
    workflow_status_id: UUID
    priority: str
    assignee_id: UUID | None = None
    reporter_id: UUID | None = None
    story_points: int | None = None
    original_estimate_seconds: int | None = None
    remaining_estimate_seconds: int | None = None
    due_date: date | None = None
    start_date: date | None = None
    resolution: str | None = None
    resolved_at: datetime | None = None
    board_rank: str
    backlog_rank: str
    is_deleted: bool
    created_at: datetime
    updated_at: datetime

    # populated by the API layer with project key
    project_key: str | None = None

    @computed_field  # type: ignore[prop-decorator]
    @property
    def ticket_key(self) -> str | None:
        if self.project_key:
            return f"{self.project_key}-{self.ticket_number}"
        return None

    model_config = {"from_attributes": True}


class TicketStatusTransition(BaseModel):
    workflow_status_id: UUID
    resolution: str | None = None


class TicketBulkUpdate(BaseModel):
    ticket_ids: list[UUID] = Field(..., min_length=1)
    workflow_status_id: UUID | None = None
    assignee_id: UUID | None = None
    priority: str | None = Field(None, pattern=r"^(lowest|low|medium|high|highest)$")
    sprint_id: UUID | None = None
    labels: list[UUID] | None = None


class TicketListParams(BaseModel):
    project_id: UUID
    offset: int = Field(0, ge=0)
    limit: int = Field(50, ge=1, le=200)
    search: str | None = None
    ticket_type: str | None = None
    priority: str | None = None
    assignee_id: UUID | None = None
    epic_id: UUID | None = None
    sprint_id: UUID | None = None
    workflow_status_id: UUID | None = None
    is_deleted: bool = False
    sort_by: str = Field("created_at", pattern=r"^(created_at|updated_at|priority|ticket_number|due_date)$")
    sort_dir: str = Field("desc", pattern=r"^(asc|desc)$")
