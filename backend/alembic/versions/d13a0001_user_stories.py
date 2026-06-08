"""user_stories tables

Revision ID: d13a0001
Revises: b2c3d4e5f6a7
Create Date: 2026-06-08

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "d13a0001"
down_revision: Union[str, None] = "b2c3d4e5f6a7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "user_stories",
        sa.Column("id", sa.UUID(), nullable=False, server_default=sa.text("gen_random_uuid()")),
        sa.Column("project_id", sa.UUID(), nullable=False),
        sa.Column("created_by", sa.UUID(), nullable=True),
        sa.Column("parent_id", sa.UUID(), nullable=True),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("quick_notes", sa.Text(), nullable=True),
        sa.Column("story_title", sa.String(500), nullable=True),
        sa.Column("story_body", sa.Text(), nullable=True),
        sa.Column("story_acceptance_criteria", sa.Text(), nullable=True),
        sa.Column("status", sa.String(30), nullable=False, server_default="not_started"),
        sa.Column("priority", sa.String(20), nullable=False, server_default="medium"),
        sa.Column("search_vector", postgresql.TSVECTOR(), nullable=True),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["parent_id"], ["user_stories.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_user_stories_project_id", "user_stories", ["project_id"])
    op.create_index("ix_user_stories_project_status", "user_stories", ["project_id", "status"])
    op.create_index("ix_user_stories_search_vector", "user_stories", ["search_vector"], postgresql_using="gin")
    op.create_index("ix_user_stories_created_by", "user_stories", ["created_by"])
    op.create_index("ix_user_stories_parent_id", "user_stories", ["parent_id"])

    op.create_table(
        "user_story_questions",
        sa.Column("id", sa.UUID(), nullable=False, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_story_id", sa.UUID(), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_by", sa.UUID(), nullable=True),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["user_story_id"], ["user_stories.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_user_story_questions_user_story_id", "user_story_questions", ["user_story_id"])

    op.create_table(
        "user_story_discussions",
        sa.Column("id", sa.UUID(), nullable=False, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_story_id", sa.UUID(), nullable=False),
        sa.Column("author_id", sa.UUID(), nullable=True),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("applies_to_all_questions", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["user_story_id"], ["user_stories.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["author_id"], ["users.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_user_story_discussions_user_story_id", "user_story_discussions", ["user_story_id"])
    op.create_index("ix_user_story_discussions_author_id", "user_story_discussions", ["author_id"])

    op.create_table(
        "user_story_discussion_questions",
        sa.Column("discussion_id", sa.UUID(), nullable=False),
        sa.Column("question_id", sa.UUID(), nullable=False),
        sa.ForeignKeyConstraint(["discussion_id"], ["user_story_discussions.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["question_id"], ["user_story_questions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("discussion_id", "question_id"),
    )

    op.create_table(
        "user_story_dependencies",
        sa.Column("story_id", sa.UUID(), nullable=False),
        sa.Column("depends_on_id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["story_id"], ["user_stories.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["depends_on_id"], ["user_stories.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("story_id", "depends_on_id"),
        sa.UniqueConstraint("story_id", "depends_on_id", name="uq_user_story_dependencies_pair"),
    )

    op.create_table(
        "user_story_ticket_links",
        sa.Column("id", sa.UUID(), nullable=False, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_story_id", sa.UUID(), nullable=False),
        sa.Column("ticket_id", sa.UUID(), nullable=False),
        sa.Column("created_by", sa.UUID(), nullable=True),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["user_story_id"], ["user_stories.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["ticket_id"], ["tickets.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="SET NULL"),
        sa.UniqueConstraint("user_story_id", "ticket_id", name="uq_user_story_ticket_links_pair"),
    )
    op.create_index("ix_user_story_ticket_links_user_story_id", "user_story_ticket_links", ["user_story_id"])
    op.create_index("ix_user_story_ticket_links_ticket_id", "user_story_ticket_links", ["ticket_id"])

    op.execute("""
        CREATE OR REPLACE FUNCTION user_stories_search_vector_update() RETURNS trigger AS $$
        BEGIN
          NEW.search_vector := to_tsvector('english',
            coalesce(NEW.title, '') || ' ' ||
            coalesce(NEW.quick_notes, '') || ' ' ||
            coalesce(NEW.story_title, '') || ' ' ||
            coalesce(NEW.story_body, '') || ' ' ||
            coalesce(NEW.story_acceptance_criteria, '')
          );
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    """)
    op.execute("""
        CREATE TRIGGER user_stories_search_vector_trigger
        BEFORE INSERT OR UPDATE OF title, quick_notes, story_title, story_body, story_acceptance_criteria
        ON user_stories
        FOR EACH ROW EXECUTE FUNCTION user_stories_search_vector_update();
    """)


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS user_stories_search_vector_trigger ON user_stories")
    op.execute("DROP FUNCTION IF EXISTS user_stories_search_vector_update()")
    op.drop_table("user_story_ticket_links")
    op.drop_table("user_story_dependencies")
    op.drop_table("user_story_discussion_questions")
    op.drop_table("user_story_discussions")
    op.drop_table("user_story_questions")
    op.drop_table("user_stories")
