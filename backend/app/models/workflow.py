from __future__ import annotations

import uuid
from typing import Optional

from sqlalchemy import Boolean, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class Workflow(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "workflows"

    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_template: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    statuses: Mapped[list[WorkflowStatus]] = relationship(
        back_populates="workflow", cascade="all, delete-orphan",
        order_by="WorkflowStatus.position",
    )
    transitions: Mapped[list[WorkflowTransition]] = relationship(
        back_populates="workflow", cascade="all, delete-orphan",
    )


class WorkflowStatus(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "workflow_statuses"
    __table_args__ = (
        UniqueConstraint("workflow_id", "name", name="uq_wf_status_name"),
    )

    workflow_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workflows.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    category: Mapped[str] = mapped_column(
        String(20), nullable=False, server_default="to_do"
    )  # to_do, in_progress, done
    color: Mapped[str] = mapped_column(String(7), nullable=False, server_default="#6B7280")
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_initial: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_terminal: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    workflow: Mapped[Workflow] = relationship(back_populates="statuses")


class WorkflowTransition(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "workflow_transitions"
    __table_args__ = (
        UniqueConstraint(
            "workflow_id", "from_status_id", "to_status_id",
            name="uq_wf_transition",
        ),
    )

    workflow_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workflows.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    from_status_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workflow_statuses.id", ondelete="CASCADE"),
        nullable=False,
    )
    to_status_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workflow_statuses.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    conditions: Mapped[dict] = mapped_column(JSONB, nullable=False, server_default="{}")

    workflow: Mapped[Workflow] = relationship(back_populates="transitions")
    from_status: Mapped[WorkflowStatus] = relationship(foreign_keys=[from_status_id])
    to_status: Mapped[WorkflowStatus] = relationship(foreign_keys=[to_status_id])
