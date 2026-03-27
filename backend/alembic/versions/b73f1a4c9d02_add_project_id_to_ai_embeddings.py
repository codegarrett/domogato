"""add_project_id_to_ai_embeddings

Revision ID: b73f1a4c9d02
Revises: a62b8bb8fe88
Create Date: 2026-03-26 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'b73f1a4c9d02'
down_revision: Union[str, None] = 'a62b8bb8fe88'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'ai_embeddings',
        sa.Column('project_id', sa.UUID(), nullable=True),
    )
    op.create_foreign_key(
        'fk_ai_embeddings_project_id',
        'ai_embeddings',
        'projects',
        ['project_id'],
        ['id'],
        ondelete='SET NULL',
    )
    op.create_index('ix_ai_embeddings_project_id', 'ai_embeddings', ['project_id'])


def downgrade() -> None:
    op.drop_index('ix_ai_embeddings_project_id', table_name='ai_embeddings')
    op.drop_constraint('fk_ai_embeddings_project_id', 'ai_embeddings', type_='foreignkey')
    op.drop_column('ai_embeddings', 'project_id')
