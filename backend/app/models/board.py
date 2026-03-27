from __future__ import annotations

import uuid
from typing import Optional

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    ForeignKey,
    Index,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class Board(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "boards"
    __table_args__ = (
        Index("ix_boards_project_id", "project_id"),
        CheckConstraint(
            "board_type IN ('kanban', 'scrum')",
            name="ck_boards_board_type",
        ),
    )

    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    board_type: Mapped[str] = mapped_column(
        String(20), nullable=False, server_default="kanban"
    )
    filter_config: Mapped[dict] = mapped_column(
        JSONB, nullable=False, server_default="{}"
    )
    is_default: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )

    columns: Mapped[list[BoardColumn]] = relationship(
        back_populates="board",
        cascade="all, delete-orphan",
        order_by="BoardColumn.position",
    )


class BoardColumn(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "board_columns"
    __table_args__ = (
        UniqueConstraint("board_id", "position", name="uq_board_columns_board_position"),
        UniqueConstraint("board_id", "workflow_status_id", name="uq_board_columns_board_status"),
    )

    board_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("boards.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    workflow_status_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workflow_statuses.id", ondelete="CASCADE"),
        nullable=False,
    )
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    wip_limit: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    is_collapsed: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )

    board: Mapped[Board] = relationship(back_populates="columns")
