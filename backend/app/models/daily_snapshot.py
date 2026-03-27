from __future__ import annotations

import uuid
from datetime import date, datetime

from sqlalchemy import Date, ForeignKey, Integer, TIMESTAMP, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, UUIDPrimaryKeyMixin


class DailySnapshot(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "daily_snapshots"
    __table_args__ = (
        UniqueConstraint("project_id", "snapshot_date", name="uq_daily_snapshot_project_date"),
    )

    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    snapshot_date: Mapped[date] = mapped_column(Date, nullable=False)
    total_tickets: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    by_status: Mapped[dict] = mapped_column(JSONB, nullable=False, server_default="{}")
    by_priority: Mapped[dict] = mapped_column(JSONB, nullable=False, server_default="{}")
    completed_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    story_points_completed: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default="now()", nullable=False,
    )
