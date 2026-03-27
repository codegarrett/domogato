"""tickets_search_vector_trigger

Revision ID: a1b2c3d4e5f6
Revises: 64019e2955a9
Create Date: 2026-03-25

"""
from typing import Sequence, Union

from alembic import op

revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "64019e2955a9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        CREATE OR REPLACE FUNCTION tickets_search_vector_update() RETURNS trigger AS $$
        BEGIN
          NEW.search_vector := to_tsvector('english',
            coalesce(NEW.title, '') || ' ' ||
            coalesce(NEW.description, '') || ' ' ||
            NEW.ticket_number::text
          );
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    """)
    op.execute("""
        DROP TRIGGER IF EXISTS trg_tickets_search_vector ON tickets;
    """)
    op.execute("""
        CREATE TRIGGER trg_tickets_search_vector
          BEFORE INSERT OR UPDATE OF title, description, ticket_number
          ON tickets
          FOR EACH ROW
          EXECUTE FUNCTION tickets_search_vector_update();
    """)
    op.execute("""
        UPDATE tickets SET search_vector = to_tsvector('english',
          coalesce(title, '') || ' ' ||
          coalesce(description, '') || ' ' ||
          ticket_number::text
        );
    """)


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS trg_tickets_search_vector ON tickets;")
    op.execute("DROP FUNCTION IF EXISTS tickets_search_vector_update();")
