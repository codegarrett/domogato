from __future__ import annotations

import uuid
from typing import Optional, TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import TSVECTOR, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.kb_space import KBSpace
    from app.models.kb_page_version import KBPageVersion
    from app.models.kb_comment import KBPageComment
    from app.models.kb_attachment import KBPageAttachment


class KBPage(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "kb_pages"
    __table_args__ = (
        UniqueConstraint("space_id", "slug", name="uq_kb_pages_space_slug"),
        Index("ix_kb_pages_search_vector", "search_vector", postgresql_using="gin"),
    )

    space_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("kb_spaces.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    parent_page_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("kb_pages.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    slug: Mapped[str] = mapped_column(String(200), nullable=False)
    content_markdown: Mapped[str] = mapped_column(Text, nullable=False, default="")
    content_html: Mapped[str] = mapped_column(Text, nullable=False, default="")
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_published: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    last_edited_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    search_vector: Mapped[Optional[str]] = mapped_column(
        TSVECTOR, nullable=True,
    )

    space: Mapped["KBSpace"] = relationship(back_populates="pages")
    parent: Mapped[Optional["KBPage"]] = relationship(
        remote_side="KBPage.id",
        back_populates="children",
    )
    children: Mapped[list["KBPage"]] = relationship(
        back_populates="parent",
    )
    versions: Mapped[list["KBPageVersion"]] = relationship(
        back_populates="page", cascade="all, delete-orphan",
    )
    comments: Mapped[list["KBPageComment"]] = relationship(
        back_populates="page", cascade="all, delete-orphan",
    )
    attachments: Mapped[list["KBPageAttachment"]] = relationship(
        back_populates="page", cascade="all, delete-orphan",
    )
