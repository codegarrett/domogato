from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

USER_STORY_STATUSES = (
    "not_started",
    "in_progress",
    "discovery",
    "story_ready",
    "ticket_created",
    "blocked",
    "deferred",
    "canceled",
)

USER_STORY_PRIORITIES = ("lowest", "low", "medium", "high", "highest")

_STATUS_PATTERN = r"^(not_started|in_progress|discovery|story_ready|ticket_created|blocked|deferred|canceled)$"
_PRIORITY_PATTERN = r"^(lowest|low|medium|high|highest)$"


class UserStoryCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)


class UserStoryUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=500)
    quick_notes: str | None = None
    story_title: str | None = Field(None, min_length=1, max_length=500)
    story_body: str | None = None
    story_acceptance_criteria: str | None = None
    status: str | None = Field(None, pattern=_STATUS_PATTERN)
    priority: str | None = Field(None, pattern=_PRIORITY_PATTERN)
    parent_id: UUID | None = None


class UserStoryQuestionCreate(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000)


class UserStoryQuestionRead(BaseModel):
    id: UUID
    text: str
    position: int
    created_by: UUID | None = None
    created_by_name: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class UserStoryDiscussionCreate(BaseModel):
    body: str = Field(..., min_length=1, max_length=50000)
    question_ids: list[UUID] | None = None
    applies_to_all_questions: bool = False


class UserStoryDiscussionRead(BaseModel):
    id: UUID
    author_id: UUID | None = None
    author_name: str | None = None
    body: str
    applies_to_all_questions: bool
    question_ids: list[UUID] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class UserStoryDependencyRead(BaseModel):
    story_id: UUID
    depends_on_id: UUID
    depends_on_title: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class UserStoryDependencyCreate(BaseModel):
    depends_on_id: UUID


class UserStoryChildBrief(BaseModel):
    id: UUID
    title: str
    status: str
    priority: str


class UserStoryTicketLinkRead(BaseModel):
    ticket_id: UUID
    ticket_key: str | None = None
    ticket_title: str | None = None
    created_at: datetime


class UserStoryRead(BaseModel):
    id: UUID
    project_id: UUID
    title: str
    quick_notes: str | None = None
    story_title: str | None = None
    story_body: str | None = None
    story_acceptance_criteria: str | None = None
    status: str
    priority: str
    parent_id: UUID | None = None
    parent_title: str | None = None
    created_by: UUID | None = None
    created_by_name: str | None = None
    created_at: datetime
    updated_at: datetime
    questions: list[UserStoryQuestionRead] = []
    discussions: list[UserStoryDiscussionRead] = []
    dependencies: list[UserStoryDependencyRead] = []
    children: list[UserStoryChildBrief] = []
    linked_tickets: list[UserStoryTicketLinkRead] = []


class UserStoryListItem(BaseModel):
    id: UUID
    project_id: UUID
    title: str
    status: str
    priority: str
    parent_id: UUID | None = None
    parent_title: str | None = None
    created_by_name: str | None = None
    question_count: int = 0
    child_count: int = 0
    created_at: datetime
    updated_at: datetime


class CreateTicketsFromUserStories(BaseModel):
    user_story_ids: list[UUID] = Field(..., min_length=1)
    ticket_type: str = Field("story", pattern=r"^(task|bug|story|epic)$")


class UserStoryForTicketRead(BaseModel):
    id: UUID
    title: str
    story_title: str | None = None
    status: str
    priority: str
    project_id: UUID
