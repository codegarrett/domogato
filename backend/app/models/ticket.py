from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Optional

from sqlalchemy import (
    BigInteger,
    Boolean,
    Date,
    ForeignKey,
    Index,
    Integer,
    SmallInteger,
    String,
    Text,
    TIMESTAMP,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB, TSVECTOR, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class Ticket(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "tickets"
    __table_args__ = (
        UniqueConstraint("project_id", "ticket_number", name="uq_tickets_project_number"),
        Index(
            "ix_tickets_project_active", "project_id",
            postgresql_where="is_deleted = false",
        ),
        Index(
            "ix_tickets_board_rank", "project_id", "workflow_status_id", "board_rank",
            postgresql_where="is_deleted = false",
        ),
        Index(
            "ix_tickets_backlog_rank", "project_id", "backlog_rank",
            postgresql_where="is_deleted = false AND sprint_id IS NULL",
        ),
        Index("ix_tickets_search_vector", "search_vector", postgresql_using="gin"),
    )

    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
    )
    epic_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("epics.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    sprint_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sprints.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    parent_ticket_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tickets.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    ticket_number: Mapped[int] = mapped_column(Integer, nullable=False)
    ticket_type: Mapped[str] = mapped_column(
        String(50), nullable=False, server_default="task"
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    workflow_status_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workflow_statuses.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    priority: Mapped[str] = mapped_column(
        String(20), nullable=False, server_default="medium"
    )
    assignee_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    reporter_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    story_points: Mapped[Optional[int]] = mapped_column(SmallInteger, nullable=True)
    original_estimate_seconds: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    remaining_estimate_seconds: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    due_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    start_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    resolution: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(
        TIMESTAMP(timezone=True), nullable=True
    )
    board_rank: Mapped[str] = mapped_column(
        String(255), nullable=False, server_default="m"
    )
    backlog_rank: Mapped[str] = mapped_column(
        String(255), nullable=False, server_default="m"
    )
    custom_field_values: Mapped[dict] = mapped_column(
        JSONB, nullable=False, server_default="{}"
    )
    is_deleted: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )
    search_vector: Mapped[Optional[str]] = mapped_column(
        TSVECTOR, nullable=True
    )

    epic: Mapped[Optional[Epic]] = relationship(back_populates="tickets")
    parent_ticket: Mapped[Optional[Ticket]] = relationship(
        remote_side="Ticket.id", back_populates="child_tickets"
    )
    child_tickets: Mapped[list[Ticket]] = relationship(back_populates="parent_ticket")
    comments: Mapped[list[Comment]] = relationship(back_populates="ticket", cascade="all, delete-orphan")
    labels: Mapped[list[Label]] = relationship(
        secondary="ticket_labels", back_populates="tickets"
    )
    attachments: Mapped[list["Attachment"]] = relationship(
        back_populates="ticket", cascade="all, delete-orphan",
    )


class TicketDependency(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "ticket_dependencies"
    __table_args__ = (
        UniqueConstraint(
            "blocking_ticket_id", "blocked_ticket_id",
            name="uq_ticket_deps_blocking_blocked",
        ),
    )

    blocking_ticket_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tickets.id", ondelete="CASCADE"),
        nullable=False,
    )
    blocked_ticket_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tickets.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    dependency_type: Mapped[str] = mapped_column(
        String(20), nullable=False, server_default="blocks"
    )
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default="now()", nullable=False
    )
