"""create daily_snapshots table

Revision ID: b9c3d5e7f1a2
Revises: a8f2c3d4e5b6
Create Date: 2026-03-25

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "b9c3d5e7f1a2"
down_revision = "a8f2c3d4e5b6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "daily_snapshots",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("snapshot_date", sa.Date(), nullable=False),
        sa.Column("total_tickets", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("by_status", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("by_priority", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("completed_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("story_points_completed", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("project_id", "snapshot_date", name="uq_daily_snapshot_project_date"),
    )
    op.create_index("ix_daily_snapshots_project_id", "daily_snapshots", ["project_id"])


def downgrade() -> None:
    op.drop_index("ix_daily_snapshots_project_id", table_name="daily_snapshots")
    op.drop_table("daily_snapshots")
