"""kb_pages_fts

Revision ID: 6a5d50c3f269
Revises: f95ed2c0b2c7
Create Date: 2026-03-25 02:07:59.257547

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '6a5d50c3f269'
down_revision: Union[str, None] = 'f95ed2c0b2c7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('kb_pages', sa.Column('search_vector', postgresql.TSVECTOR(), nullable=True))
    op.create_index('ix_kb_pages_search_vector', 'kb_pages', ['search_vector'], unique=False, postgresql_using='gin')

    op.execute("""
        CREATE OR REPLACE FUNCTION kb_pages_search_vector_update() RETURNS trigger AS $fn$
        BEGIN
            NEW.search_vector :=
                setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
                setweight(to_tsvector('english', coalesce(NEW.content_markdown, '')), 'B');
            RETURN NEW;
        END;
        $fn$ LANGUAGE plpgsql;
    """)
    op.execute("""
        CREATE TRIGGER kb_pages_search_vector_trigger
        BEFORE INSERT OR UPDATE OF title, content_markdown
        ON kb_pages
        FOR EACH ROW
        EXECUTE FUNCTION kb_pages_search_vector_update();
    """)
    op.execute("""
        UPDATE kb_pages SET search_vector =
            setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
            setweight(to_tsvector('english', coalesce(content_markdown, '')), 'B');
    """)


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS kb_pages_search_vector_trigger ON kb_pages")
    op.execute("DROP FUNCTION IF EXISTS kb_pages_search_vector_update()")
    op.drop_index('ix_kb_pages_search_vector', table_name='kb_pages', postgresql_using='gin')
    op.drop_column('kb_pages', 'search_vector')
