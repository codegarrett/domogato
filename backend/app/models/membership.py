from __future__ import annotations

import uuid

from sqlalchemy import ForeignKey, Index, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class OrgMembership(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "org_memberships"
    __table_args__ = (
        UniqueConstraint(
            "user_id", "organization_id", name="uq_org_memberships_user_org"
        ),
        Index("ix_org_memberships_organization_id", "organization_id"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
    )
    role: Mapped[str] = mapped_column(String(20), nullable=False)

    user: Mapped[User] = relationship(back_populates="org_memberships")
    organization: Mapped[Organization] = relationship(
        back_populates="memberships"
    )


class ProjectMembership(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "project_memberships"
    __table_args__ = (
        UniqueConstraint(
            "user_id", "project_id", name="uq_project_memberships_user_project"
        ),
        Index("ix_project_memberships_project_id", "project_id"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
    )
    role: Mapped[str] = mapped_column(String(20), nullable=False)

    user: Mapped[User] = relationship(back_populates="project_memberships")
    project: Mapped[Project] = relationship(back_populates="memberships")
