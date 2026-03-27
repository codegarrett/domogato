from __future__ import annotations

import uuid
from typing import Optional, TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    pass


class KBStoryWorkflow(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "kb_story_workflows"
    __table_args__ = (
        UniqueConstraint("project_id", name="uq_kb_story_workflows_project"),
    )

    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(
        String(255), nullable=False, default="User Story Workflow",
    )

    statuses: Mapped[list["KBStoryWorkflowStatus"]] = relationship(
        back_populates="workflow",
        cascade="all, delete-orphan",
        order_by="KBStoryWorkflowStatus.position",
    )


class KBStoryWorkflowStatus(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "kb_story_workflow_statuses"
    __table_args__ = (
        UniqueConstraint("workflow_id", "name", name="uq_kb_story_wf_status_name"),
    )

    workflow_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("kb_story_workflows.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    category: Mapped[str] = mapped_column(String(20), nullable=False, default="draft")
    color: Mapped[str] = mapped_column(String(7), nullable=False, default="#6B7280")
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_initial: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_terminal: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    workflow: Mapped["KBStoryWorkflow"] = relationship(back_populates="statuses")
