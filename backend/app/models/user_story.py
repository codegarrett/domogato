from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import (
    Boolean,
    Column,
    ForeignKey,
    Index,
    Integer,
    String,
    Table,
    Text,
    TIMESTAMP,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import TSVECTOR, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.ticket import Ticket

user_story_discussion_questions = Table(
    "user_story_discussion_questions",
    Base.metadata,
    Column(
        "discussion_id",
        UUID(as_uuid=True),
        ForeignKey("user_story_discussions.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "question_id",
        UUID(as_uuid=True),
        ForeignKey("user_story_questions.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)


class UserStory(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "user_stories"
    __table_args__ = (
        Index("ix_user_stories_project_status", "project_id", "status"),
        Index("ix_user_stories_search_vector", "search_vector", postgresql_using="gin"),
    )

    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    parent_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("user_stories.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    quick_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    story_title: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    story_body: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    story_acceptance_criteria: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(
        String(30), nullable=False, server_default="not_started",
    )
    priority: Mapped[str] = mapped_column(
        String(20), nullable=False, server_default="medium",
    )
    search_vector: Mapped[Optional[str]] = mapped_column(TSVECTOR, nullable=True)

    parent: Mapped[Optional["UserStory"]] = relationship(
        remote_side="UserStory.id",
        back_populates="children",
        foreign_keys=[parent_id],
    )
    children: Mapped[list["UserStory"]] = relationship(
        back_populates="parent",
        foreign_keys=[parent_id],
    )
    questions: Mapped[list["UserStoryQuestion"]] = relationship(
        back_populates="user_story",
        cascade="all, delete-orphan",
        order_by="UserStoryQuestion.position",
    )
    discussions: Mapped[list["UserStoryDiscussion"]] = relationship(
        back_populates="user_story",
        cascade="all, delete-orphan",
    )
    ticket_links: Mapped[list["UserStoryTicketLink"]] = relationship(
        back_populates="user_story",
        cascade="all, delete-orphan",
    )
    depends_on: Mapped[list["UserStoryDependency"]] = relationship(
        back_populates="story",
        foreign_keys="UserStoryDependency.story_id",
        cascade="all, delete-orphan",
    )


class UserStoryQuestion(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "user_story_questions"

    user_story_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("user_stories.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    text: Mapped[str] = mapped_column(Text, nullable=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        nullable=False,
        server_default="now()",
    )

    user_story: Mapped[UserStory] = relationship(back_populates="questions")
    discussions: Mapped[list["UserStoryDiscussion"]] = relationship(
        secondary=user_story_discussion_questions,
        back_populates="referenced_questions",
    )


class UserStoryDiscussion(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "user_story_discussions"

    user_story_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("user_stories.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    author_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    body: Mapped[str] = mapped_column(Text, nullable=False)
    applies_to_all_questions: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="false",
    )

    user_story: Mapped[UserStory] = relationship(back_populates="discussions")
    referenced_questions: Mapped[list[UserStoryQuestion]] = relationship(
        secondary=user_story_discussion_questions,
        back_populates="discussions",
    )


class UserStoryDependency(Base):
    __tablename__ = "user_story_dependencies"
    __table_args__ = (
        UniqueConstraint("story_id", "depends_on_id", name="uq_user_story_dependencies_pair"),
    )

    story_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("user_stories.id", ondelete="CASCADE"),
        primary_key=True,
    )
    depends_on_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("user_stories.id", ondelete="CASCADE"),
        primary_key=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        nullable=False,
        server_default="now()",
    )

    story: Mapped[UserStory] = relationship(
        back_populates="depends_on",
        foreign_keys=[story_id],
    )
    depends_on_story: Mapped[UserStory] = relationship(foreign_keys=[depends_on_id])


class UserStoryTicketLink(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "user_story_ticket_links"
    __table_args__ = (
        UniqueConstraint("user_story_id", "ticket_id", name="uq_user_story_ticket_links_pair"),
    )

    user_story_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("user_stories.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    ticket_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tickets.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        nullable=False,
        server_default="now()",
    )

    user_story: Mapped[UserStory] = relationship(back_populates="ticket_links")
    ticket: Mapped["Ticket"] = relationship()
