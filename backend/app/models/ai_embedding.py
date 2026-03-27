import uuid
from typing import Optional

from sqlalchemy import ForeignKey, Index, Integer, String, Text, TIMESTAMP, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from pgvector.sqlalchemy import Vector

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class AIEmbedding(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "ai_embeddings"

    project_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    content_type: Mapped[str] = mapped_column(String(50), nullable=False)
    content_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    chunk_text: Mapped[str] = mapped_column(Text, nullable=False)
    embedding = mapped_column(Vector(1536), nullable=False)
    metadata_: Mapped[dict] = mapped_column("metadata", JSONB, nullable=False, server_default="{}")

    __table_args__ = (
        Index("ix_ai_embeddings_content", "content_type", "content_id"),
    )
