"""create attachments table

Revision ID: a8f2c3d4e5b6
Revises: e36d9728943c
Create Date: 2026-03-25

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "a8f2c3d4e5b6"
down_revision = "e36d9728943c"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "attachments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("ticket_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("uploaded_by_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("filename", sa.String(255), nullable=False),
        sa.Column("content_type", sa.String(127), nullable=False),
        sa.Column("size_bytes", sa.BigInteger, nullable=False),
        sa.Column("s3_key", sa.Text, nullable=False),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_attachments_ticket_id", "attachments", ["ticket_id"])
    op.create_index("ix_attachments_project_id", "attachments", ["project_id"])


def downgrade() -> None:
    op.drop_index("ix_attachments_project_id", table_name="attachments")
    op.drop_index("ix_attachments_ticket_id", table_name="attachments")
    op.drop_table("attachments")
