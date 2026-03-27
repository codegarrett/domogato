from __future__ import annotations

import uuid
from typing import Optional

from sqlalchemy import Boolean, ForeignKey, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class SavedView(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "saved_views"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    project_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    entity_type: Mapped[str] = mapped_column(
        String(50), nullable=False, server_default="ticket"
    )
    filters: Mapped[dict] = mapped_column(JSONB, nullable=False, server_default="{}")
    sort_by: Mapped[str] = mapped_column(
        String(50), nullable=False, server_default="created_at"
    )
    sort_dir: Mapped[str] = mapped_column(
        String(10), nullable=False, server_default="desc"
    )
    columns: Mapped[list] = mapped_column(JSONB, nullable=False, server_default="[]")
    is_default: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_shared: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
