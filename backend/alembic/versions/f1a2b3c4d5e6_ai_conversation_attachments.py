"""ai_conversation_attachments

Revision ID: f1a2b3c4d5e6
Revises: e8f4a1b2c3d4
Create Date: 2026-06-03 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f1a2b3c4d5e6"
down_revision: Union[str, None] = "e8f4a1b2c3d4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "ai_conversation_attachments",
        sa.Column("conversation_id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("message_id", sa.UUID(), nullable=True),
        sa.Column("filename", sa.String(length=255), nullable=False),
        sa.Column("content_type", sa.String(length=127), nullable=False),
        sa.Column("size_bytes", sa.BigInteger(), nullable=False),
        sa.Column("s3_key", sa.Text(), nullable=False),
        sa.Column("promoted_to_type", sa.String(length=50), nullable=True),
        sa.Column("promoted_to_id", sa.UUID(), nullable=True),
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["conversation_id"], ["ai_conversations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["message_id"], ["ai_messages.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_ai_conversation_attachments_conversation_id",
        "ai_conversation_attachments",
        ["conversation_id"],
    )
    op.create_index(
        "ix_ai_conversation_attachments_user_id",
        "ai_conversation_attachments",
        ["user_id"],
    )
    op.create_index(
        "ix_ai_conversation_attachments_message_id",
        "ai_conversation_attachments",
        ["message_id"],
    )


def downgrade() -> None:
    op.drop_table("ai_conversation_attachments")
