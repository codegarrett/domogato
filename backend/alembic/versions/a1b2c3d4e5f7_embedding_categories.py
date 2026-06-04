"""embedding categories and documents

Revision ID: a1b2c3d4e5f7
Revises: f1a2b3c4d5e6
Create Date: 2026-06-04 22:00:00.000000

"""
from typing import Sequence, Union
import uuid

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "a1b2c3d4e5f7"
down_revision: Union[str, None] = "f1a2b3c4d5e6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SYSTEM_CATEGORIES = [
    ("knowledge_base", "Knowledge Base", "KB pages and attachments"),
    ("documents", "Documents", "Ticket attachments and uploaded documents"),
]


def upgrade() -> None:
    op.create_table(
        "embedding_categories",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("project_id", sa.UUID(), nullable=False),
        sa.Column("slug", sa.String(length=100), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("is_system", sa.Boolean(), server_default="false", nullable=False),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("project_id", "slug", name="uq_embedding_categories_project_slug"),
    )
    op.create_index("ix_embedding_categories_project_id", "embedding_categories", ["project_id"])

    op.create_table(
        "embedding_documents",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("project_id", sa.UUID(), nullable=False),
        sa.Column("category_id", sa.UUID(), nullable=False),
        sa.Column("title", sa.String(length=500), nullable=False),
        sa.Column("filename", sa.String(length=255), nullable=False),
        sa.Column("content_type", sa.String(length=127), nullable=False),
        sa.Column("size_bytes", sa.BigInteger(), nullable=False),
        sa.Column("s3_key", sa.Text(), nullable=False),
        sa.Column("uploaded_by_id", sa.UUID(), nullable=True),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["category_id"], ["embedding_categories.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["uploaded_by_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_embedding_documents_project_id", "embedding_documents", ["project_id"])
    op.create_index("ix_embedding_documents_category_id", "embedding_documents", ["category_id"])

    op.add_column("ai_embeddings", sa.Column("category_id", sa.UUID(), nullable=True))
    op.create_foreign_key(
        "fk_ai_embeddings_category_id",
        "ai_embeddings",
        "embedding_categories",
        ["category_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_ai_embeddings_category_id", "ai_embeddings", ["category_id"])
    op.create_index(
        "ix_ai_embeddings_project_category",
        "ai_embeddings",
        ["project_id", "category_id"],
    )

    conn = op.get_bind()

    project_ids = conn.execute(
        sa.text("SELECT DISTINCT project_id FROM ai_embeddings WHERE project_id IS NOT NULL")
    ).fetchall()
    project_ids = [row[0] for row in project_ids]

    all_projects = conn.execute(sa.text("SELECT id FROM projects")).fetchall()
    for (project_id,) in all_projects:
        if project_id not in project_ids:
            project_ids.append(project_id)

    category_map: dict[tuple[uuid.UUID, str], uuid.UUID] = {}
    for project_id in project_ids:
        for slug, name, description in SYSTEM_CATEGORIES:
            cat_id = uuid.uuid4()
            conn.execute(
                sa.text(
                    """
                    INSERT INTO embedding_categories
                        (id, project_id, slug, name, description, is_system, created_at, updated_at)
                    VALUES
                        (:id, :project_id, :slug, :name, :description, true, now(), now())
                    """
                ),
                {
                    "id": cat_id,
                    "project_id": project_id,
                    "slug": slug,
                    "name": name,
                    "description": description,
                },
            )
            category_map[(project_id, slug)] = cat_id

    for project_id in project_ids:
        kb_id = category_map[(project_id, "knowledge_base")]
        docs_id = category_map[(project_id, "documents")]
        conn.execute(
            sa.text(
                """
                UPDATE ai_embeddings
                SET category_id = :kb_id
                WHERE project_id = :project_id
                  AND content_type IN ('kb_page', 'kb_attachment')
                """
            ),
            {"kb_id": kb_id, "project_id": project_id},
        )
        conn.execute(
            sa.text(
                """
                UPDATE ai_embeddings
                SET category_id = :docs_id
                WHERE project_id = :project_id
                  AND content_type IN ('ticket', 'ticket_attachment', 'issue_report', 'embedding_document')
                """
            ),
            {"docs_id": docs_id, "project_id": project_id},
        )


def downgrade() -> None:
    op.drop_index("ix_ai_embeddings_project_category", table_name="ai_embeddings")
    op.drop_index("ix_ai_embeddings_category_id", table_name="ai_embeddings")
    op.drop_constraint("fk_ai_embeddings_category_id", "ai_embeddings", type_="foreignkey")
    op.drop_column("ai_embeddings", "category_id")

    op.drop_index("ix_embedding_documents_category_id", table_name="embedding_documents")
    op.drop_index("ix_embedding_documents_project_id", table_name="embedding_documents")
    op.drop_table("embedding_documents")

    op.drop_index("ix_embedding_categories_project_id", table_name="embedding_categories")
    op.drop_table("embedding_categories")
