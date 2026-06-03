"""workflow_status_show_on_board

Revision ID: e8f4a1b2c3d4
Revises: d12a0003
Create Date: 2026-06-02 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "e8f4a1b2c3d4"
down_revision: Union[str, None] = "d12a0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "workflow_statuses",
        sa.Column("show_on_board", sa.Boolean(), nullable=False, server_default="true"),
    )


def downgrade() -> None:
    op.drop_column("workflow_statuses", "show_on_board")
