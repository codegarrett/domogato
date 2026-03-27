from __future__ import annotations

import uuid
from typing import Optional, TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.kb_page import KBPage


class KBPageComment(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "kb_page_comments"

    page_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("kb_pages.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    parent_comment_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("kb_page_comments.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    author_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    body: Mapped[str] = mapped_column(Text, nullable=False)
    is_deleted: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    page: Mapped["KBPage"] = relationship(back_populates="comments")
    parent: Mapped[Optional["KBPageComment"]] = relationship(
        remote_side="KBPageComment.id",
        back_populates="replies",
    )
    replies: Mapped[list["KBPageComment"]] = relationship(
        back_populates="parent",
    )
