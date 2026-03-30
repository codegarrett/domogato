from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class IssueReportCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    description: str | None = None
    priority: str = Field("medium", pattern=r"^(low|medium|high|critical)$")


class IssueReportUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=500)
    description: str | None = None
    priority: str | None = Field(None, pattern=r"^(low|medium|high|critical)$")
    status: str | None = Field(None, pattern=r"^(open|reviewing|ticket_created|dismissed)$")


class IssueReportReporterCreate(BaseModel):
    user_id: UUID | None = None
    original_description: str | None = None


class CreateTicketFromReports(BaseModel):
    issue_report_ids: list[UUID] = Field(..., min_length=1)
    title: str | None = Field(None, min_length=1, max_length=500)
    description: str | None = None
    ticket_type: str = Field("bug", pattern=r"^(task|bug|story|epic)$")
    priority: str = Field("medium", pattern=r"^(lowest|low|medium|high|highest)$")


class IssueReportReporterRead(BaseModel):
    user_id: UUID
    display_name: str | None = None
    original_description: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class IssueReportTicketLinkRead(BaseModel):
    ticket_id: UUID
    ticket_key: str | None = None
    ticket_title: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class IssueReportRead(BaseModel):
    id: UUID
    project_id: UUID
    title: str
    description: str | None = None
    status: str
    priority: str
    created_by: UUID | None = None
    created_by_name: str | None = None
    reporter_count: int
    created_at: datetime
    updated_at: datetime
    reporters: list[IssueReportReporterRead] = Field(default_factory=list)
    linked_tickets: list[IssueReportTicketLinkRead] = Field(default_factory=list)

    model_config = {"from_attributes": True}


class SimilarReportRead(BaseModel):
    id: UUID
    title: str
    description: str | None = None
    status: str
    priority: str
    reporter_count: int
    similarity_score: float
