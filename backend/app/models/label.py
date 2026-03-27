from __future__ import annotations

import uuid
from typing import Optional

from sqlalchemy import Column, ForeignKey, String, Table
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

ticket_labels = Table(
    "ticket_labels",
    Base.metadata,
    Column("ticket_id", UUID(as_uuid=True), ForeignKey("tickets.id", ondelete="CASCADE"), primary_key=True),
    Column("label_id", UUID(as_uuid=True), ForeignKey("labels.id", ondelete="CASCADE"), primary_key=True),
)


class Label(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "labels"

    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    color: Mapped[str] = mapped_column(
        String(7), nullable=False, server_default="#6B7280"
    )
    description: Mapped[Optional[str]] = mapped_column(
        String(500), nullable=True
    )

    tickets: Mapped[list[Ticket]] = relationship(
        secondary=ticket_labels, back_populates="labels"
    )
