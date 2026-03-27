from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Space
# ---------------------------------------------------------------------------

class SpaceCreate(BaseModel):
    name: str = Field(..., max_length=255, min_length=1)
    description: str | None = None
    icon: str | None = Field(None, max_length=50)


class SpaceUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    icon: str | None = None
    position: int | None = None
    is_archived: bool | None = None


class SpaceRead(BaseModel):
    id: UUID
    project_id: UUID
    name: str
    description: str | None = None
    slug: str
    icon: str | None = None
    position: int
    is_archived: bool
    created_by: UUID | None = None
    page_count: int = 0
    last_updated_at: datetime | None = None
    contributor_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class RecentPageRead(BaseModel):
    id: UUID
    title: str
    slug: str
    space_name: str = ""
    space_slug: str = ""
    updated_at: datetime
    last_edited_by_name: str | None = None


# ---------------------------------------------------------------------------
# Page
# ---------------------------------------------------------------------------

class PageCreate(BaseModel):
    title: str = Field(..., max_length=500, min_length=1)
    content_markdown: str = ""
    content_html: str = ""
    parent_page_id: UUID | None = None
    is_published: bool = True
    template_id: UUID | None = None
    page_type: str | None = None


class PageUpdate(BaseModel):
    title: str | None = None
    content_markdown: str | None = None
    content_html: str | None = None
    is_published: bool | None = None
    change_summary: str | None = Field(None, max_length=500)


class PageMetaBrief(BaseModel):
    id: UUID
    page_type: str
    story_workflow_status_id: UUID | None = None
    story_status: dict | None = None
    ticket_link_count: int = 0

    model_config = {"from_attributes": True}


class PageRead(BaseModel):
    id: UUID
    space_id: UUID
    parent_page_id: UUID | None = None
    title: str
    slug: str
    content_markdown: str
    content_html: str
    position: int
    is_published: bool
    is_deleted: bool
    created_by: UUID | None = None
    last_edited_by: UUID | None = None
    version_count: int = 0
    comment_count: int = 0
    meta: PageMetaBrief | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PageTreeNode(BaseModel):
    id: UUID
    title: str
    slug: str
    position: int
    is_published: bool
    children: list[PageTreeNode] = []


class PageMoveRequest(BaseModel):
    parent_page_id: UUID | None = None
    position: int


class PageAncestor(BaseModel):
    id: UUID
    title: str
    slug: str


# ---------------------------------------------------------------------------
# Version
# ---------------------------------------------------------------------------

class VersionRead(BaseModel):
    id: UUID
    page_id: UUID
    version_number: int
    title: str
    content_markdown: str
    content_html: str
    change_summary: str | None = None
    created_by: UUID | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class VersionListItem(BaseModel):
    id: UUID
    version_number: int
    title: str
    change_summary: str | None = None
    created_by: UUID | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class DiffEntry(BaseModel):
    type: str = Field(..., pattern=r"^(added|removed|unchanged)$")
    content: str


class DiffResponse(BaseModel):
    from_version: VersionListItem
    to_version: VersionListItem
    diff: list[DiffEntry]
    stats: dict[str, int]


# ---------------------------------------------------------------------------
# Comment
# ---------------------------------------------------------------------------

class CommentCreate(BaseModel):
    body: str = Field(..., min_length=1)
    parent_comment_id: UUID | None = None


class CommentUpdate(BaseModel):
    body: str = Field(..., min_length=1)


class CommentAuthor(BaseModel):
    id: UUID
    display_name: str
    avatar_url: str | None = None


class CommentRead(BaseModel):
    id: UUID
    page_id: UUID
    parent_comment_id: UUID | None = None
    author: CommentAuthor
    body: str
    is_deleted: bool
    created_at: datetime
    updated_at: datetime
    replies: list[CommentRead] = []

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Attachment
# ---------------------------------------------------------------------------

class KBAttachmentCreate(BaseModel):
    filename: str = Field(..., max_length=500, min_length=1)
    content_type: str = Field(..., max_length=255)
    size_bytes: int = Field(..., gt=0, le=50 * 1024 * 1024)


class KBAttachmentRead(BaseModel):
    id: UUID
    page_id: UUID
    filename: str
    content_type: str
    size_bytes: int
    created_by: UUID | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class KBAttachmentPresignResponse(BaseModel):
    attachment: KBAttachmentRead
    upload_url: str


class KBAttachmentDownloadResponse(BaseModel):
    download_url: str


# ---------------------------------------------------------------------------
# Template
# ---------------------------------------------------------------------------

class TemplateCreate(BaseModel):
    name: str = Field(..., max_length=255, min_length=1)
    description: str | None = None
    content_markdown: str = ""
    content_html: str = ""
    icon: str | None = Field(None, max_length=50)


class TemplateUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    content_markdown: str | None = None
    content_html: str | None = None
    icon: str | None = None


class TemplateRead(BaseModel):
    id: UUID
    project_id: UUID | None = None
    name: str
    description: str | None = None
    content_markdown: str
    content_html: str
    icon: str | None = None
    page_type: str | None = None
    is_builtin: bool
    created_by: UUID | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# Rebuild forward-ref models so recursive types resolve.
PageTreeNode.model_rebuild()
CommentRead.model_rebuild()
