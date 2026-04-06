"""add reporter_name and reporter_email to issue_reports

Revision ID: d12a0003
Revises: d12a0002
Create Date: 2026-03-30

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "d12a0003"
down_revision: Union[str, None] = "d12a0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("issue_reports", sa.Column("reporter_name", sa.String(255), nullable=True))
    op.add_column("issue_reports", sa.Column("reporter_email", sa.String(255), nullable=True))


def downgrade() -> None:
    op.drop_column("issue_reports", "reporter_email")
    op.drop_column("issue_reports", "reporter_name")
