from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class SavedViewCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    entity_type: str = "ticket"
    filters: dict = {}
    sort_by: str = "created_at"
    sort_dir: str = Field("desc", pattern=r"^(asc|desc)$")
    columns: list[str] = []
    is_default: bool = False
    is_shared: bool = False


class SavedViewUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=200)
    filters: dict | None = None
    sort_by: str | None = None
    sort_dir: str | None = Field(None, pattern=r"^(asc|desc)$")
    columns: list[str] | None = None
    is_default: bool | None = None
    is_shared: bool | None = None


class SavedViewRead(BaseModel):
    id: UUID
    user_id: UUID
    project_id: UUID | None = None
    name: str
    entity_type: str
    filters: dict
    sort_by: str
    sort_dir: str
    columns: list
    is_default: bool
    is_shared: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
