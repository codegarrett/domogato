"""add_tool_calls_to_ai_messages

Revision ID: a62b8bb8fe88
Revises: cd0ed9a7320c
Create Date: 2026-03-26 04:34:15.993809

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'a62b8bb8fe88'
down_revision: Union[str, None] = 'cd0ed9a7320c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('ai_messages', sa.Column('tool_calls', postgresql.JSONB(astext_type=sa.Text()), nullable=True))


def downgrade() -> None:
    op.drop_column('ai_messages', 'tool_calls')
