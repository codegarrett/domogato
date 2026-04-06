from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class OrganizationCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, examples=["Acme Corp"])
    slug: str | None = Field(None, min_length=2, max_length=100, pattern=r"^[a-z0-9][a-z0-9-]*[a-z0-9]$", examples=["acme-corp"])
    description: str | None = Field(None, examples=["Main engineering organization"])
    avatar_url: str | None = None
    settings: dict[str, Any] = Field(default_factory=dict)

    model_config = {"json_schema_extra": {"examples": [{"name": "Acme Corp", "slug": "acme-corp", "description": "Main engineering organization"}]}}


class OrganizationUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    avatar_url: str | None = None
    settings: dict[str, Any] | None = None


class OrganizationRead(BaseModel):
    id: UUID
    name: str
    slug: str
    description: str | None = None
    avatar_url: str | None = None
    settings: dict[str, Any] = Field(default_factory=dict)
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class OrgSettingsUpdate(BaseModel):
    auto_join_new_users: bool | None = None
    default_org: bool | None = None


class OrgSettingsRead(BaseModel):
    auto_join_new_users: bool = False
    default_org: bool = False


class OrgMemberCreate(BaseModel):
    user_id: UUID | None = None
    email: str | None = None
    role: str = Field("member", pattern=r"^(owner|admin|member)$")


class OrgMemberUpdate(BaseModel):
    role: str = Field(..., pattern=r"^(owner|admin|member)$")


class OrgMemberRead(BaseModel):
    id: UUID
    user_id: UUID
    email: str
    display_name: str
    avatar_url: str | None = None
    role: str
    created_at: datetime

    model_config = {"from_attributes": True}
