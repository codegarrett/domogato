"""issue_reports tables

Revision ID: d12a0001
Revises: c11a0001
Create Date: 2026-03-30

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "d12a0001"
down_revision: Union[str, None] = "c11a0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "issue_reports",
        sa.Column("id", sa.UUID(), nullable=False, server_default=sa.text("gen_random_uuid()")),
        sa.Column("project_id", sa.UUID(), nullable=False),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("status", sa.String(30), nullable=False, server_default="open"),
        sa.Column("priority", sa.String(20), nullable=False, server_default="medium"),
        sa.Column("created_by", sa.UUID(), nullable=True),
        sa.Column("reporter_count", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("search_vector", postgresql.TSVECTOR(), nullable=True),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_issue_reports_project_status", "issue_reports", ["project_id", "status"])
    op.create_index("ix_issue_reports_search_vector", "issue_reports", ["search_vector"], postgresql_using="gin")
    op.create_index("ix_issue_reports_created_by", "issue_reports", ["created_by"])

    op.create_table(
        "issue_report_reporters",
        sa.Column("id", sa.UUID(), nullable=False, server_default=sa.text("gen_random_uuid()")),
        sa.Column("issue_report_id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("original_description", sa.Text(), nullable=True),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["issue_report_id"], ["issue_reports.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("issue_report_id", "user_id", name="uq_issue_report_reporters_report_user"),
    )
    op.create_index("ix_issue_report_reporters_user_id", "issue_report_reporters", ["user_id"])

    op.create_table(
        "issue_report_ticket_links",
        sa.Column("id", sa.UUID(), nullable=False, server_default=sa.text("gen_random_uuid()")),
        sa.Column("issue_report_id", sa.UUID(), nullable=False),
        sa.Column("ticket_id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["issue_report_id"], ["issue_reports.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["ticket_id"], ["tickets.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("issue_report_id", "ticket_id", name="uq_issue_report_ticket_links_report_ticket"),
    )
    op.create_index("ix_issue_report_ticket_links_ticket_id", "issue_report_ticket_links", ["ticket_id"])

    op.execute("""
        CREATE OR REPLACE FUNCTION issue_reports_search_vector_update() RETURNS trigger AS $$
        BEGIN
          NEW.search_vector := to_tsvector('english',
            coalesce(NEW.title, '') || ' ' ||
            coalesce(NEW.description, '')
          );
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    """)
    op.execute("""
        CREATE TRIGGER trg_issue_reports_search_vector
          BEFORE INSERT OR UPDATE OF title, description
          ON issue_reports
          FOR EACH ROW
          EXECUTE FUNCTION issue_reports_search_vector_update();
    """)


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS trg_issue_reports_search_vector ON issue_reports;")
    op.execute("DROP FUNCTION IF EXISTS issue_reports_search_vector_update();")
    op.drop_table("issue_report_ticket_links")
    op.drop_table("issue_report_reporters")
    op.drop_table("issue_reports")
