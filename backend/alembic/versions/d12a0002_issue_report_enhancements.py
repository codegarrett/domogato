"""issue_report attachments, labels, source_url

Revision ID: d12a0002
Revises: d12a0001
Create Date: 2026-03-30

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "d12a0002"
down_revision: Union[str, None] = "d12a0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "issue_reports",
        sa.Column("source_url", sa.String(2000), nullable=True),
    )

    op.create_table(
        "issue_report_attachments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("issue_report_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("issue_reports.id", ondelete="CASCADE"), nullable=False),
        sa.Column("uploaded_by_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("filename", sa.String(255), nullable=False),
        sa.Column("content_type", sa.String(127), nullable=False),
        sa.Column("size_bytes", sa.BigInteger, nullable=False),
        sa.Column("s3_key", sa.Text, nullable=False),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_issue_report_attachments_report_id", "issue_report_attachments", ["issue_report_id"])

    op.create_table(
        "issue_report_labels",
        sa.Column("issue_report_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("issue_reports.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("label_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("labels.id", ondelete="CASCADE"), primary_key=True),
    )


def downgrade() -> None:
    op.drop_table("issue_report_labels")
    op.drop_index("ix_issue_report_attachments_report_id", table_name="issue_report_attachments")
    op.drop_table("issue_report_attachments")
    op.drop_column("issue_reports", "source_url")
