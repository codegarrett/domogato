from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import (
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    TIMESTAMP,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import TSVECTOR, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class IssueReport(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "issue_reports"
    __table_args__ = (
        Index(
            "ix_issue_reports_project_status", "project_id", "status",
        ),
        Index("ix_issue_reports_search_vector", "search_vector", postgresql_using="gin"),
    )

    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(
        String(30), nullable=False, server_default="open",
    )
    priority: Mapped[str] = mapped_column(
        String(20), nullable=False, server_default="medium",
    )
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    reporter_count: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default="1",
    )
    search_vector: Mapped[Optional[str]] = mapped_column(
        TSVECTOR, nullable=True,
    )

    reporters: Mapped[list[IssueReportReporter]] = relationship(
        back_populates="issue_report", cascade="all, delete-orphan",
    )
    ticket_links: Mapped[list[IssueReportTicketLink]] = relationship(
        back_populates="issue_report", cascade="all, delete-orphan",
    )


class IssueReportReporter(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "issue_report_reporters"
    __table_args__ = (
        UniqueConstraint(
            "issue_report_id", "user_id",
            name="uq_issue_report_reporters_report_user",
        ),
    )

    issue_report_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("issue_reports.id", ondelete="CASCADE"),
        nullable=False,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    original_description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default="now()", nullable=False,
    )

    issue_report: Mapped[IssueReport] = relationship(back_populates="reporters")


class IssueReportTicketLink(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "issue_report_ticket_links"
    __table_args__ = (
        UniqueConstraint(
            "issue_report_id", "ticket_id",
            name="uq_issue_report_ticket_links_report_ticket",
        ),
    )

    issue_report_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("issue_reports.id", ondelete="CASCADE"),
        nullable=False,
    )
    ticket_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tickets.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default="now()", nullable=False,
    )

    issue_report: Mapped[IssueReport] = relationship(back_populates="ticket_links")
