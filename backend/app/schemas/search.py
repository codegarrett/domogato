from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class SearchResult(BaseModel):
    type: str
    id: str
    title: str
    subtitle: str | None = None
    highlight: str | None = None
    url: str
    project_id: str | None = None
    updated_at: str | None = None


class SearchResponse(BaseModel):
    results: list[SearchResult]
    total: int
