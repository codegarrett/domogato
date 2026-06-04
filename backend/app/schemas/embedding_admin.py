from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class ProjectEmbeddingCount(BaseModel):
    project_id: UUID
    project_name: str
    count: int


class EmbeddingStatsOut(BaseModel):
    total_chunks: int
    unique_sources: int
    by_content_type: dict[str, int]
    by_project: list[ProjectEmbeddingCount]
    embedding_configured: bool


class EmbeddingListItem(BaseModel):
    id: UUID
    project_id: UUID | None
    project_name: str | None
    content_type: str
    content_id: UUID
    chunk_index: int
    chunk_text_preview: str
    metadata: dict
    created_at: datetime
    updated_at: datetime


class EmbeddingDetailOut(BaseModel):
    id: UUID
    project_id: UUID | None
    project_name: str | None
    content_type: str
    content_id: UUID
    chunk_index: int
    chunk_text: str
    metadata: dict
    created_at: datetime
    updated_at: datetime


class DeleteContentEmbeddingsRequest(BaseModel):
    content_type: str
    content_id: UUID


class DeleteEmbeddingsOut(BaseModel):
    deleted: int


class EmbeddingReindexOut(BaseModel):
    pages_queued: int = 0
    attachments_queued: int = 0
    message: str | None = None


class SemanticSearchRequest(BaseModel):
    query: str = Field(..., min_length=1)
    project_id: UUID
    content_types: list[str] | None = None
    limit: int = Field(10, ge=1, le=50)


class SemanticSearchResult(BaseModel):
    id: str
    content_type: str
    content_id: str
    chunk_index: int
    chunk_text: str
    metadata: dict
    similarity: float


class SemanticSearchOut(BaseModel):
    results: list[SemanticSearchResult]
    query: str
