"""Embedding service — generate, store, delete, and search vector embeddings."""
from __future__ import annotations

from uuid import UUID

import structlog
from sqlalchemy import delete, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.ai_embedding import AIEmbedding
from app.services.llm.base import LLMConfigError
from app.services.llm.factory import get_embedding_provider, is_embedding_configured
from app.services.text_extraction import chunk_text

logger = structlog.get_logger()

BATCH_SIZE = 64


async def embed_and_store(
    db: AsyncSession,
    *,
    project_id: UUID,
    content_type: str,
    content_id: UUID,
    text_content: str,
    metadata: dict,
) -> int:
    """Chunk text, generate embeddings, and store in ai_embeddings.

    Returns the number of chunks embedded. Replaces any existing embeddings
    for the same (content_type, content_id) only after vectors are generated.
    """
    if not is_embedding_configured():
        logger.warning(
            "embedding_skipped_not_configured",
            content_type=content_type,
            content_id=str(content_id),
        )
        return 0

    chunks = chunk_text(text_content)
    if not chunks:
        await delete_embeddings(db, content_type=content_type, content_id=content_id)
        return 0

    try:
        provider = get_embedding_provider()
    except LLMConfigError:
        logger.exception(
            "embedding_provider_unavailable",
            content_type=content_type,
            content_id=str(content_id),
        )
        return 0

    pending_rows: list[AIEmbedding] = []
    for batch_start in range(0, len(chunks), BATCH_SIZE):
        batch = chunks[batch_start : batch_start + BATCH_SIZE]
        try:
            vectors = await provider.create_embeddings(batch)
        except Exception:
            logger.exception(
                "embedding_generation_failed",
                content_type=content_type,
                content_id=str(content_id),
                batch_start=batch_start,
            )
            continue

        if len(vectors) != len(batch):
            logger.error(
                "embedding_batch_size_mismatch",
                content_type=content_type,
                content_id=str(content_id),
                batch_start=batch_start,
                expected=len(batch),
                got=len(vectors),
            )
            continue

        for i, (chunk, vector) in enumerate(zip(batch, vectors)):
            if len(vector) != settings.EMBEDDING_DIMENSIONS:
                logger.error(
                    "embedding_dimension_mismatch",
                    content_type=content_type,
                    content_id=str(content_id),
                    batch_start=batch_start,
                    expected=settings.EMBEDDING_DIMENSIONS,
                    got=len(vector),
                    model=getattr(provider, "model", None),
                )
                continue

            pending_rows.append(
                AIEmbedding(
                    project_id=project_id,
                    content_type=content_type,
                    content_id=content_id,
                    chunk_index=batch_start + i,
                    chunk_text=chunk,
                    embedding=vector,
                    metadata_=metadata,
                )
            )

    if not pending_rows:
        logger.error(
            "embedding_store_failed_no_vectors",
            content_type=content_type,
            content_id=str(content_id),
            chunk_count=len(chunks),
        )
        return 0

    await delete_embeddings(db, content_type=content_type, content_id=content_id)
    for row in pending_rows:
        db.add(row)
    await db.flush()
    return len(pending_rows)


async def delete_embeddings(
    db: AsyncSession,
    *,
    content_type: str,
    content_id: UUID,
) -> int:
    """Delete all embedding rows for a given content reference."""
    result = await db.execute(
        delete(AIEmbedding).where(
            AIEmbedding.content_type == content_type,
            AIEmbedding.content_id == content_id,
        )
    )
    await db.flush()
    return result.rowcount  # type: ignore[return-value]


async def vector_search(
    db: AsyncSession,
    *,
    query_text: str,
    project_id: UUID,
    content_types: list[str] | None = None,
    limit: int = 5,
) -> list[dict]:
    """Perform semantic search using pgvector cosine distance.

    Returns a list of result dicts with chunk_text, metadata, and similarity score.
    """
    if not is_embedding_configured():
        return []

    provider = get_embedding_provider()
    try:
        vectors = await provider.create_embeddings([query_text])
        query_vector = vectors[0]
    except Exception:
        logger.exception("embedding_query_failed", query=query_text[:100])
        return []

    vector_str = "[" + ",".join(str(v) for v in query_vector) + "]"

    type_filter = ""
    if content_types:
        placeholders = ", ".join(f"'{ct}'" for ct in content_types)
        type_filter = f"AND content_type IN ({placeholders})"

    sql = text(f"""
        SELECT
            id,
            content_type,
            content_id,
            chunk_index,
            chunk_text,
            metadata,
            1 - (embedding <=> :vector_param) AS similarity
        FROM ai_embeddings
        WHERE project_id = :project_id
        {type_filter}
        ORDER BY embedding <=> :vector_param
        LIMIT :limit_param
    """)

    rows = (
        await db.execute(
            sql,
            {
                "vector_param": vector_str,
                "project_id": project_id,
                "limit_param": limit,
            },
        )
    ).all()

    results = []
    for row in rows:
        results.append({
            "id": str(row.id),
            "content_type": row.content_type,
            "content_id": str(row.content_id),
            "chunk_index": row.chunk_index,
            "chunk_text": row.chunk_text,
            "metadata": row.metadata if isinstance(row.metadata, dict) else {},
            "similarity": round(float(row.similarity), 4),
        })

    return results
