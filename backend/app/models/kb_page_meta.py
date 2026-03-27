from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional, TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.kb_page import KBPage
    from app.models.kb_story_workflow import KBStoryWorkflowStatus


class KBPageMeta(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "kb_page_meta"
    __table_args__ = (
        UniqueConstraint("page_id", name="uq_kb_page_meta_page_id"),
    )

    page_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("kb_pages.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    page_type: Mapped[str] = mapped_column(String(50), nullable=False)
    story_workflow_status_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("kb_story_workflow_statuses.id", ondelete="SET NULL"),
        nullable=True,
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    page: Mapped["KBPage"] = relationship(backref="meta", uselist=False)
    story_status: Mapped[Optional["KBStoryWorkflowStatus"]] = relationship()
    ticket_links: Mapped[list["KBPageTicketLink"]] = relationship(
        back_populates="page_meta",
        cascade="all, delete-orphan",
    )


class KBPageTicketLink(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "kb_page_ticket_links"
    __table_args__ = (
        UniqueConstraint("page_meta_id", "ticket_id", name="uq_kb_page_ticket_link"),
    )

    page_meta_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("kb_page_meta.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    ticket_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tickets.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    page_meta: Mapped["KBPageMeta"] = relationship(back_populates="ticket_links")
    ticket: Mapped["Ticket"] = relationship()  # noqa: F821
