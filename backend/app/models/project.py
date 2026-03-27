from __future__ import annotations

import uuid
from typing import Optional

from sqlalchemy import (
    Boolean,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class Project(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "projects"
    __table_args__ = (
        UniqueConstraint("organization_id", "key", name="uq_projects_org_key"),
    )

    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    key: Mapped[str] = mapped_column(String(10), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    avatar_url: Mapped[Optional[str]] = mapped_column(
        String(2048), nullable=True
    )
    visibility: Mapped[str] = mapped_column(
        String(20), nullable=False, server_default="private"
    )
    default_workflow_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )
    ticket_sequence: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default="0"
    )
    settings: Mapped[dict] = mapped_column(
        JSONB, nullable=False, server_default="{}"
    )
    is_archived: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )

    organization: Mapped[Organization] = relationship(
        back_populates="projects"
    )
    memberships: Mapped[list[ProjectMembership]] = relationship(
        back_populates="project"
    )
