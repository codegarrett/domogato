from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, String, TIMESTAMP
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class User(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "users"

    oidc_subject: Mapped[str] = mapped_column(
        String(255), unique=True, nullable=False, index=True
    )
    email: Mapped[str] = mapped_column(
        String(320), unique=True, nullable=False, index=True
    )
    display_name: Mapped[str] = mapped_column(
        String(255), nullable=False, index=True
    )
    avatar_url: Mapped[Optional[str]] = mapped_column(
        String(2048), nullable=True
    )
    password_hash: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True
    )
    is_system_admin: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True
    )
    preferences: Mapped[dict] = mapped_column(
        JSONB, nullable=False, server_default="{}"
    )
    last_login_at: Mapped[Optional[datetime]] = mapped_column(
        TIMESTAMP(timezone=True), nullable=True
    )

    org_memberships: Mapped[list[OrgMembership]] = relationship(
        back_populates="user"
    )
    project_memberships: Mapped[list[ProjectMembership]] = relationship(
        back_populates="user"
    )
