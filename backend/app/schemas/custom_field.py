from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


FIELD_TYPES = {"text", "number", "date", "select", "multi_select", "user", "url", "checkbox"}


class CustomFieldOptionCreate(BaseModel):
    label: str = Field(..., min_length=1, max_length=255)
    color: str | None = None
    position: int = 0


class CustomFieldOptionRead(BaseModel):
    id: UUID
    field_definition_id: UUID
    label: str
    color: str | None = None
    position: int

    model_config = {"from_attributes": True}


class CustomFieldDefinitionCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    field_type: str = Field(..., pattern=r"^(text|number|date|select|multi_select|user|url|checkbox)$")
    description: str | None = None
    is_required: bool = False
    validation_rules: dict[str, Any] = Field(default_factory=dict)
    options: list[CustomFieldOptionCreate] = Field(default_factory=list)


class CustomFieldDefinitionUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    is_required: bool | None = None
    validation_rules: dict[str, Any] | None = None
    is_active: bool | None = None


class CustomFieldDefinitionRead(BaseModel):
    id: UUID
    project_id: UUID
    name: str
    field_type: str
    description: str | None = None
    is_required: bool
    position: int
    validation_rules: dict[str, Any] = Field(default_factory=dict)
    is_active: bool
    options: list[CustomFieldOptionRead] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CustomFieldValuesSet(BaseModel):
    values: dict[str, Any] = Field(
        ...,
        description="Map of field_definition_id to value",
    )


class CustomFieldValuesRead(BaseModel):
    values: dict[str, Any] = Field(default_factory=dict)
