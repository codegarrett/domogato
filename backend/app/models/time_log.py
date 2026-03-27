from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Optional

from sqlalchemy import Date, ForeignKey, Index, Integer, String, Text
from sqlalchemy.dialects.postgresql import TIMESTAMP, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class TimeLog(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "time_logs"
    __table_args__ = (
        Index("ix_time_logs_ticket_id", "ticket_id"),
        Index("ix_time_logs_user_id", "user_id"),
        Index("ix_time_logs_work_date", "work_date"),
        Index("ix_time_logs_project_id", "project_id"),
    )

    ticket_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tickets.id", ondelete="CASCADE"),
        nullable=False,
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    seconds_spent: Mapped[int] = mapped_column(Integer, nullable=False)
    work_date: Mapped[date] = mapped_column(Date, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    activity_type: Mapped[str] = mapped_column(
        String(50), nullable=False, server_default="general"
    )
