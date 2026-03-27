"""phase11_watchers_prefs_views_search

Revision ID: c11a0001
Revises: b73f1a4c9d02
Create Date: 2026-03-26 18:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "c11a0001"
down_revision: Union[str, None] = "b73f1a4c9d02"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ticket_watchers
    op.create_table(
        "ticket_watchers",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("ticket_id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["ticket_id"], ["tickets.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("ticket_id", "user_id", name="uq_ticket_watchers_ticket_user"),
    )
    op.create_index("ix_ticket_watchers_ticket_id", "ticket_watchers", ["ticket_id"])
    op.create_index("ix_ticket_watchers_user_id", "ticket_watchers", ["user_id"])

    # notification_preferences
    op.create_table(
        "notification_preferences",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("event_category", sa.String(50), nullable=False),
        sa.Column("in_app", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("email", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column(
            "email_delivery",
            sa.String(20),
            nullable=False,
            server_default="digest",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("user_id", "event_category", name="uq_notif_pref_user_event"),
    )
    op.create_index("ix_notification_preferences_user_id", "notification_preferences", ["user_id"])

    # saved_views
    op.create_table(
        "saved_views",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("project_id", sa.UUID(), nullable=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("entity_type", sa.String(50), nullable=False, server_default="ticket"),
        sa.Column("filters", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("sort_by", sa.String(50), nullable=False, server_default="created_at"),
        sa.Column("sort_dir", sa.String(10), nullable=False, server_default="desc"),
        sa.Column("columns", postgresql.JSONB(), nullable=False, server_default="[]"),
        sa.Column("is_default", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("is_shared", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_saved_views_user_id", "saved_views", ["user_id"])
    op.create_index("ix_saved_views_project_id", "saved_views", ["project_id"])

    # emailed_at on notifications
    op.add_column(
        "notifications",
        sa.Column("emailed_at", sa.TIMESTAMP(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("notifications", "emailed_at")
    op.drop_table("saved_views")
    op.drop_table("notification_preferences")
    op.drop_table("ticket_watchers")
