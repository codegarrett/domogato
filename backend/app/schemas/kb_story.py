from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Story Workflow
# ---------------------------------------------------------------------------

class StoryWorkflowStatusCreate(BaseModel):
    name: str = Field(..., max_length=100, min_length=1)
    category: str = Field("draft", max_length=20)
    color: str = Field("#6B7280", pattern=r"^#[0-9A-Fa-f]{6}$")
    position: int = Field(0, ge=0)
    is_initial: bool = False
    is_terminal: bool = False


class StoryWorkflowStatusUpdate(BaseModel):
    name: str | None = Field(None, max_length=100, min_length=1)
    category: str | None = Field(None, max_length=20)
    color: str | None = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")
    position: int | None = Field(None, ge=0)
    is_initial: bool | None = None
    is_terminal: bool | None = None


class StoryWorkflowStatusRead(BaseModel):
    id: UUID
    workflow_id: UUID
    name: str
    category: str
    color: str
    position: int
    is_initial: bool
    is_terminal: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class StoryWorkflowRead(BaseModel):
    id: UUID
    project_id: UUID
    name: str
    statuses: list[StoryWorkflowStatusRead] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Page Meta
# ---------------------------------------------------------------------------

class StoryStatusBrief(BaseModel):
    id: UUID
    name: str
    category: str
    color: str
    position: int
    is_initial: bool
    is_terminal: bool

    model_config = {"from_attributes": True}


class PageMetaRead(BaseModel):
    id: UUID
    page_id: UUID
    page_type: str
    story_workflow_status_id: UUID | None = None
    story_status: StoryStatusBrief | None = None
    project_id: UUID
    ticket_link_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PageMetaUpdate(BaseModel):
    story_workflow_status_id: UUID | None = None


# ---------------------------------------------------------------------------
# Ticket Links
# ---------------------------------------------------------------------------

class PageTicketLinkCreate(BaseModel):
    ticket_id: UUID
    note: str | None = Field(None, max_length=500)


class PageTicketLinkRead(BaseModel):
    id: UUID
    page_meta_id: UUID
    ticket_id: UUID
    ticket_key: str = ""
    ticket_title: str = ""
    ticket_priority: str = ""
    ticket_status: str = ""
    ticket_status_color: str = ""
    ticket_assignee_name: str | None = None
    ticket_assignee_id: UUID | None = None
    note: str | None = None
    created_by: UUID | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Reverse lookup: Ticket -> User Stories
# ---------------------------------------------------------------------------

class UserStoryForTicketRead(BaseModel):
    page_id: UUID
    page_title: str
    page_slug: str
    space_id: UUID
    space_name: str
    space_slug: str
    story_status_name: str | None = None
    story_status_color: str | None = None
    story_status_category: str | None = None
