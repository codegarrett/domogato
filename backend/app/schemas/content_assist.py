"""Schemas for LLM-assisted ticket and issue report content generation."""
from __future__ import annotations

from enum import Enum
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class ContentAssistContext(str, Enum):
    TICKET_CREATE = "ticket_create"
    TICKET_EDIT = "ticket_edit"
    ISSUE_CREATE = "issue_create"
    ISSUE_EDIT = "issue_edit"
    ISSUE_ME_TOO = "issue_me_too"
    TICKET_FROM_REPORTS = "ticket_from_reports"
    USER_STORY_CREATE = "user_story_create"
    USER_STORY_REFINE = "user_story_refine"


class ContentAssistGenerateRequest(BaseModel):
    context: ContentAssistContext
    prompt: str = Field(..., min_length=1, max_length=8000)
    project_id: UUID | None = None
    current_fields: dict[str, Any] | None = None
    reference_items: list[dict[str, Any]] | None = None


class ContentAssistGenerateResponse(BaseModel):
    title: str | None = None
    description: str | None = None
    ticket_type: str | None = None
    priority: str | None = None
    story_points: int | None = None
    source_url: str | None = None
    story_title: str | None = None
    story_body: str | None = None
    story_acceptance_criteria: str | None = None


class ContentAssistTranslateRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=50000)
    target_locale: str = Field(..., pattern=r"^(en|es)$")
    content_format: str = Field("plain", pattern=r"^(markdown|plain)$")


class ContentAssistTranslateResponse(BaseModel):
    translated_text: str
