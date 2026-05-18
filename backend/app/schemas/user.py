from __future__ import annotations

from datetime import datetime
from uuid import UUID
from typing import Any

from pydantic import BaseModel, Field, model_validator


class UserBase(BaseModel):
    email: str
    display_name: str
    avatar_url: str | None = None


class UserRead(UserBase):
    id: UUID
    is_system_admin: bool
    is_active: bool
    preferences: dict[str, Any] = Field(default_factory=dict)
    last_login_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

    @model_validator(mode="wrap")
    @classmethod
    def resolve_stored_avatar_url(cls, value: Any) -> Any:
        from app.models.user import User
        from app.utils.avatars import resolve_avatar_url

        if isinstance(value, User):
            return {
                "id": value.id,
                "email": value.email,
                "display_name": value.display_name,
                "avatar_url": resolve_avatar_url(value.id, value.avatar_url),
                "is_system_admin": value.is_system_admin,
                "is_active": value.is_active,
                "preferences": value.preferences or {},
                "last_login_at": value.last_login_at,
                "created_at": value.created_at,
                "updated_at": value.updated_at,
            }
        if isinstance(value, dict) and value.get("id") is not None:
            value = {
                **value,
                "avatar_url": resolve_avatar_url(value["id"], value.get("avatar_url")),
            }
        return value


class UserReadWithMemberships(UserRead):
    org_memberships: list[OrgMembershipRead] = Field(default_factory=list)
    project_memberships: list[ProjectMembershipRead] = Field(default_factory=list)


class UserUpdate(BaseModel):
    display_name: str | None = None
    avatar_url: str | None = None
    preferences: dict[str, Any] | None = None


class UserAdminUpdate(BaseModel):
    is_active: bool | None = None
    is_system_admin: bool | None = None


class OrgMembershipRead(BaseModel):
    id: UUID
    organization_id: UUID
    organization_name: str | None = None
    organization_slug: str | None = None
    role: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ProjectMembershipRead(BaseModel):
    id: UUID
    project_id: UUID
    project_name: str | None = None
    project_key: str | None = None
    role: str
    created_at: datetime

    model_config = {"from_attributes": True}


# Fix forward reference
UserReadWithMemberships.model_rebuild()
