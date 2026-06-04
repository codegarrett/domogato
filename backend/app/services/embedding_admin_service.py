"""Admin operations for browsing and managing vector embeddings."""
from __future__ import annotations

from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import delete, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ai_embedding import AIEmbedding
from app.models.kb_attachment import KBPageAttachment
from app.models.project import Project
from app.schemas.embedding_admin import (
    DeleteEmbeddingsOut,
    EmbeddingDetailOut,
    EmbeddingListItem,
    EmbeddingReindexOut,
    EmbeddingStatsOut,
    ProjectEmbeddingCount,
    SemanticSearchOut,
    SemanticSearchResult,
)
from app.services.embedding_service import delete_embeddings, vector_search
from app.services.llm.factory import is_embedding_configured

PREVIEW_LENGTH = 200
TOP_PROJECTS = 20


def _preview_text(text: str) -> str:
    if len(text) <= PREVIEW_LENGTH:
        return text
    return text[:PREVIEW_LENGTH] + "…"


def _row_to_list_item(row: AIEmbedding, project_name: str | None) -> EmbeddingListItem:
    return EmbeddingListItem(
        id=row.id,
        project_id=row.project_id,
        project_name=project_name,
        content_type=row.content_type,
        content_id=row.content_id,
        chunk_index=row.chunk_index,
        chunk_text_preview=_preview_text(row.chunk_text),
        metadata=row.metadata_ if isinstance(row.metadata_, dict) else {},
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


async def get_embedding_stats(db: AsyncSession) -> EmbeddingStatsOut:
    total_result = await db.execute(select(func.count()).select_from(AIEmbedding))
    total_chunks = total_result.scalar_one()

    unique_result = await db.execute(
        select(func.count()).select_from(
            select(AIEmbedding.content_type, AIEmbedding.content_id)
            .distinct()
            .subquery()
        )
    )
    unique_sources = unique_result.scalar_one()

    type_rows = (
        await db.execute(
            select(AIEmbedding.content_type, func.count())
            .group_by(AIEmbedding.content_type)
            .order_by(AIEmbedding.content_type)
        )
    ).all()
    by_content_type = {row[0]: row[1] for row in type_rows}

    project_rows = (
        await db.execute(
            select(
                AIEmbedding.project_id,
                Project.name,
                func.count(),
            )
            .outerjoin(Project, Project.id == AIEmbedding.project_id)
            .group_by(AIEmbedding.project_id, Project.name)
            .order_by(func.count().desc())
            .limit(TOP_PROJECTS)
        )
    ).all()
    by_project = [
        ProjectEmbeddingCount(
            project_id=row[0],
            project_name=row[1] or "(unknown)",
            count=row[2],
        )
        for row in project_rows
        if row[0] is not None
    ]

    return EmbeddingStatsOut(
        total_chunks=total_chunks,
        unique_sources=unique_sources,
        by_content_type=by_content_type,
        by_project=by_project,
        embedding_configured=is_embedding_configured(),
    )


def _search_filter(q: str):
    pattern = f"%{q}%"
    return or_(
        AIEmbedding.chunk_text.ilike(pattern),
        AIEmbedding.metadata_["page_title"].astext.ilike(pattern),
        AIEmbedding.metadata_["filename"].astext.ilike(pattern),
        AIEmbedding.metadata_["space_name"].astext.ilike(pattern),
    )


async def list_embeddings(
    db: AsyncSession,
    *,
    offset: int,
    limit: int,
    project_id: UUID | None = None,
    content_type: str | None = None,
    q: str | None = None,
) -> tuple[list[EmbeddingListItem], int]:
    base = select(AIEmbedding, Project.name).outerjoin(
        Project, Project.id == AIEmbedding.project_id
    )

    count_base = select(func.count()).select_from(AIEmbedding)

    if project_id is not None:
        base = base.where(AIEmbedding.project_id == project_id)
        count_base = count_base.where(AIEmbedding.project_id == project_id)

    if content_type is not None:
        base = base.where(AIEmbedding.content_type == content_type)
        count_base = count_base.where(AIEmbedding.content_type == content_type)

    if q and q.strip():
        search = _search_filter(q.strip())
        base = base.where(search)
        count_base = count_base.where(search)

    total = (await db.execute(count_base)).scalar_one()

    rows = (
        await db.execute(
            base.order_by(AIEmbedding.created_at.desc(), AIEmbedding.chunk_index.asc())
            .offset(offset)
            .limit(limit)
        )
    ).all()

    items = [_row_to_list_item(row[0], row[1]) for row in rows]
    return items, total


async def get_embedding(db: AsyncSession, embedding_id: UUID) -> EmbeddingDetailOut:
    row = (
        await db.execute(
            select(AIEmbedding, Project.name)
            .outerjoin(Project, Project.id == AIEmbedding.project_id)
            .where(AIEmbedding.id == embedding_id)
        )
    ).one_or_none()

    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Embedding not found")

    embedding, project_name = row
    return EmbeddingDetailOut(
        id=embedding.id,
        project_id=embedding.project_id,
        project_name=project_name,
        content_type=embedding.content_type,
        content_id=embedding.content_id,
        chunk_index=embedding.chunk_index,
        chunk_text=embedding.chunk_text,
        metadata=embedding.metadata_ if isinstance(embedding.metadata_, dict) else {},
        created_at=embedding.created_at,
        updated_at=embedding.updated_at,
    )


async def delete_embedding_row(db: AsyncSession, embedding_id: UUID) -> DeleteEmbeddingsOut:
    result = await db.execute(
        delete(AIEmbedding).where(AIEmbedding.id == embedding_id)
    )
    await db.flush()
    if result.rowcount == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Embedding not found")
    return DeleteEmbeddingsOut(deleted=result.rowcount)


async def delete_content_embeddings(
    db: AsyncSession,
    *,
    content_type: str,
    content_id: UUID,
) -> DeleteEmbeddingsOut:
    deleted = await delete_embeddings(
        db, content_type=content_type, content_id=content_id
    )
    return DeleteEmbeddingsOut(deleted=deleted)


async def admin_semantic_search(
    db: AsyncSession,
    *,
    query: str,
    project_id: UUID,
    content_types: list[str] | None = None,
    limit: int = 10,
) -> SemanticSearchOut:
    if not is_embedding_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Embedding provider is not configured",
        )

    project = await db.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    results = await vector_search(
        db,
        query_text=query,
        project_id=project_id,
        content_types=content_types,
        limit=limit,
    )

    return SemanticSearchOut(
        query=query,
        results=[
            SemanticSearchResult(
                id=r["id"],
                content_type=r["content_type"],
                content_id=r["content_id"],
                chunk_index=r["chunk_index"],
                chunk_text=r["chunk_text"],
                metadata=r["metadata"],
                similarity=r["similarity"],
            )
            for r in results
        ],
    )


async def reindex_content(
    db: AsyncSession,
    *,
    content_type: str,
    content_id: UUID,
) -> EmbeddingReindexOut:
    if not is_embedding_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Embedding provider is not configured",
        )

    from app.tasks.embedding_tasks import (
        embed_kb_attachment,
        schedule_kb_page_embedding,
    )

    if content_type == "kb_page":
        schedule_kb_page_embedding(str(content_id))
        return EmbeddingReindexOut(
            pages_queued=1,
            message="KB page reindex queued",
        )

    if content_type == "kb_attachment":
        attachment = await db.get(KBPageAttachment, content_id)
        if attachment is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Attachment not found",
            )
        embed_kb_attachment.apply_async(
            args=[str(content_id), str(attachment.page_id)],
            countdown=3,
        )
        return EmbeddingReindexOut(
            attachments_queued=1,
            message="KB attachment reindex queued",
        )

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=f"Unsupported content type: {content_type}",
    )


async def _count_project_sources(db: AsyncSession, project_id: UUID) -> tuple[int, int]:
    from app.models.kb_page import KBPage
    from app.models.kb_space import KBSpace

    page_ids_subq = (
        select(KBPage.id)
        .join(KBSpace, KBSpace.id == KBPage.space_id)
        .where(
            KBSpace.project_id == project_id,
            KBPage.is_deleted.is_(False),
            KBPage.content_markdown.isnot(None),
            KBPage.content_markdown != "",
        )
    )

    pages_result = await db.execute(select(func.count()).select_from(page_ids_subq.subquery()))
    pages_count = pages_result.scalar_one()

    attachments_result = await db.execute(
        select(func.count())
        .select_from(KBPageAttachment)
        .where(KBPageAttachment.page_id.in_(page_ids_subq))
    )
    attachments_count = attachments_result.scalar_one()

    return pages_count, attachments_count


async def reindex_project(db: AsyncSession, project_id: UUID) -> EmbeddingReindexOut:
    if not is_embedding_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Embedding provider is not configured",
        )

    project = await db.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    pages_count, attachments_count = await _count_project_sources(db, project_id)

    from app.tasks.embedding_tasks import reindex_project_embeddings

    reindex_project_embeddings.delay(str(project_id))
    return EmbeddingReindexOut(
        pages_queued=pages_count,
        attachments_queued=attachments_count,
        message="Project reindex queued in background",
    )
