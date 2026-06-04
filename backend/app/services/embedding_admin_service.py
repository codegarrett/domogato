"""Admin operations for browsing and managing vector embeddings."""
from __future__ import annotations
from uuid import UUID
from fastapi import HTTPException, UploadFile, status
from sqlalchemy import delete, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.ai_embedding import AIEmbedding
from app.models.embedding_category import EmbeddingCategory
from app.models.embedding_document import EmbeddingDocument
from app.models.kb_attachment import KBPageAttachment
from app.models.project import Project
from app.schemas.embedding_admin import (
    CategoryEmbeddingCount,
    CreateEmbeddingCategoryRequest,
    DeleteEmbeddingsOut,
    EmbeddingCategoryOut,
    EmbeddingDetailOut,
    EmbeddingDocumentOut,
    EmbeddingListItem,
    EmbeddingReindexOut,
    EmbeddingStatsOut,
    ProjectEmbeddingCount,
    SemanticSearchOut,
    SemanticSearchResult,
)
from app.services import embedding_document_service
from app.services.embedding_category_service import (
    create_custom_category,
    delete_custom_category,
    list_categories,
)
from app.services.embedding_constants import (
    CONTENT_EMBEDDING_DOCUMENT,
    CONTENT_KB_ATTACHMENT,
    CONTENT_KB_PAGE,
    CONTENT_TICKET_ATTACHMENT,
    SYSTEM_DOCUMENTS,
    SYSTEM_KB,
)
from app.services.embedding_service import delete_embeddings, vector_search
from app.services.llm.factory import is_embedding_configured
PREVIEW_LENGTH = 200
TOP_PROJECTS = 20
def _preview_text(text: str) -> str:
    if len(text) <= PREVIEW_LENGTH:
        return text
    return text[:PREVIEW_LENGTH] + "…"
def _row_to_list_item(
    row: AIEmbedding,
    project_name: str | None,
    category: EmbeddingCategory | None,
) -> EmbeddingListItem:
    return EmbeddingListItem(
        id=row.id,
        project_id=row.project_id,
        project_name=project_name,
        category_id=row.category_id,
        category_slug=category.slug if category else None,
        category_name=category.name if category else None,
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
    category_rows = (
        await db.execute(
            select(
                AIEmbedding.category_id,
                EmbeddingCategory.slug,
                EmbeddingCategory.name,
                func.count(),
            )
            .outerjoin(EmbeddingCategory, EmbeddingCategory.id == AIEmbedding.category_id)
            .group_by(AIEmbedding.category_id, EmbeddingCategory.slug, EmbeddingCategory.name)
            .order_by(func.count().desc())
        )
    ).all()
    by_category = [
        CategoryEmbeddingCount(
            category_id=row[0],
            category_slug=row[1] or "(uncategorized)",
            category_name=row[2] or "(uncategorized)",
            count=row[3],
        )
        for row in category_rows
        if row[0] is not None
    ]
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
        by_category=by_category,
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
        AIEmbedding.metadata_["title"].astext.ilike(pattern),
    )
async def list_embeddings(
    db: AsyncSession,
    *,
    offset: int,
    limit: int,
    project_id: UUID | None = None,
    category_id: UUID | None = None,
    content_type: str | None = None,
    q: str | None = None,
) -> tuple[list[EmbeddingListItem], int]:
    base = (
        select(AIEmbedding, Project.name, EmbeddingCategory)
        .outerjoin(Project, Project.id == AIEmbedding.project_id)
        .outerjoin(EmbeddingCategory, EmbeddingCategory.id == AIEmbedding.category_id)
    )
    count_base = select(func.count()).select_from(AIEmbedding)
    if project_id is not None:
        base = base.where(AIEmbedding.project_id == project_id)
        count_base = count_base.where(AIEmbedding.project_id == project_id)
    if category_id is not None:
        base = base.where(AIEmbedding.category_id == category_id)
        count_base = count_base.where(AIEmbedding.category_id == category_id)
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
    items = [_row_to_list_item(row[0], row[1], row[2]) for row in rows]
    return items, total
async def get_embedding(db: AsyncSession, embedding_id: UUID) -> EmbeddingDetailOut:
    row = (
        await db.execute(
            select(AIEmbedding, Project.name, EmbeddingCategory)
            .outerjoin(Project, Project.id == AIEmbedding.project_id)
            .outerjoin(EmbeddingCategory, EmbeddingCategory.id == AIEmbedding.category_id)
            .where(AIEmbedding.id == embedding_id)
        )
    ).one_or_none()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Embedding not found")
    embedding, project_name, category = row
    return EmbeddingDetailOut(
        id=embedding.id,
        project_id=embedding.project_id,
        project_name=project_name,
        category_id=embedding.category_id,
        category_slug=category.slug if category else None,
        category_name=category.name if category else None,
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
    category_id: UUID | None = None,
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
    category_ids = [category_id] if category_id else None
    results = await vector_search(
        db,
        query_text=query,
        project_id=project_id,
        category_ids=category_ids,
        content_types=content_types if not category_ids else None,
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
        schedule_embedding_document,
        schedule_kb_page_embedding,
        schedule_ticket_attachment_embedding,
    )
    if content_type == CONTENT_KB_PAGE:
        schedule_kb_page_embedding(str(content_id))
        return EmbeddingReindexOut(
            pages_queued=1,
            message="KB page reindex queued",
        )
    if content_type == CONTENT_KB_ATTACHMENT:
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
    if content_type == CONTENT_TICKET_ATTACHMENT:
        schedule_ticket_attachment_embedding(str(content_id))
        return EmbeddingReindexOut(
            attachments_queued=1,
            message="Ticket attachment reindex queued",
        )
    if content_type == CONTENT_EMBEDDING_DOCUMENT:
        doc = await db.get(EmbeddingDocument, content_id)
        if doc is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found",
            )
        schedule_embedding_document(str(content_id))
        return EmbeddingReindexOut(
            documents_queued=1,
            message="Embedding document reindex queued",
        )
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=f"Unsupported content type: {content_type}",
    )
async def _count_project_sources(
    db: AsyncSession,
    project_id: UUID,
    category_slug: str | None = None,
) -> tuple[int, int, int]:
    from app.models.attachment import Attachment
    from app.models.kb_page import KBPage
    from app.models.kb_space import KBSpace
    slug = category_slug or SYSTEM_KB
    if slug == SYSTEM_KB:
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
        return pages_count, attachments_count, 0
    if slug == SYSTEM_DOCUMENTS:
        ticket_attachments = await db.execute(
            select(func.count())
            .select_from(Attachment)
            .where(Attachment.project_id == project_id)
        )
        manual_docs = await db.execute(
            select(func.count())
            .select_from(EmbeddingDocument)
            .where(EmbeddingDocument.project_id == project_id)
        )
        return 0, ticket_attachments.scalar_one(), manual_docs.scalar_one()
    from app.services.embedding_category_service import get_category_by_slug
    category = await get_category_by_slug(db, project_id, slug)
    if category is None:
        return 0, 0, 0
    manual_docs = await db.execute(
        select(func.count())
        .select_from(EmbeddingDocument)
        .where(
            EmbeddingDocument.project_id == project_id,
            EmbeddingDocument.category_id == category.id,
        )
    )
    return 0, 0, manual_docs.scalar_one()
async def reindex_project(
    db: AsyncSession,
    project_id: UUID,
    category_slug: str | None = None,
) -> EmbeddingReindexOut:
    if not is_embedding_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Embedding provider is not configured",
        )
    project = await db.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    pages_count, attachments_count, documents_count = await _count_project_sources(
        db, project_id, category_slug
    )
    from app.tasks.embedding_tasks import reindex_project_embeddings
    reindex_project_embeddings.delay(str(project_id), category_slug)
    return EmbeddingReindexOut(
        pages_queued=pages_count,
        attachments_queued=attachments_count,
        documents_queued=documents_count,
        message="Project reindex queued in background",
    )
async def list_embedding_categories(
    db: AsyncSession,
    project_id: UUID,
) -> list[EmbeddingCategoryOut]:
    project = await db.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    rows = await list_categories(db, project_id)
    return [
        EmbeddingCategoryOut(
            id=cat.id,
            project_id=cat.project_id,
            slug=cat.slug,
            name=cat.name,
            description=cat.description,
            is_system=cat.is_system,
            chunk_count=count,
            created_at=cat.created_at,
            updated_at=cat.updated_at,
        )
        for cat, count in rows
    ]
async def create_embedding_category(
    db: AsyncSession,
    body: CreateEmbeddingCategoryRequest,
) -> EmbeddingCategoryOut:
    cat = await create_custom_category(
        db,
        project_id=body.project_id,
        slug=body.slug,
        name=body.name,
        description=body.description,
    )
    return EmbeddingCategoryOut(
        id=cat.id,
        project_id=cat.project_id,
        slug=cat.slug,
        name=cat.name,
        description=cat.description,
        is_system=cat.is_system,
        chunk_count=0,
        created_at=cat.created_at,
        updated_at=cat.updated_at,
    )
async def delete_embedding_category(db: AsyncSession, category_id: UUID) -> None:
    await delete_custom_category(db, category_id)
async def list_embedding_documents(
    db: AsyncSession,
    *,
    project_id: UUID,
    category_id: UUID | None = None,
    offset: int,
    limit: int,
) -> tuple[list[EmbeddingDocumentOut], int]:
    project = await db.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    docs, total = await embedding_document_service.list_documents(
        db,
        project_id=project_id,
        category_id=category_id,
        offset=offset,
        limit=limit,
    )
    category_ids = {doc.category_id for doc in docs}
    categories: dict[UUID, EmbeddingCategory] = {}
    if category_ids:
        rows = (
            await db.execute(
                select(EmbeddingCategory).where(EmbeddingCategory.id.in_(category_ids))
            )
        ).scalars().all()
        categories = {cat.id: cat for cat in rows}
    items = [
        EmbeddingDocumentOut(
            id=doc.id,
            project_id=doc.project_id,
            category_id=doc.category_id,
            category_slug=categories[doc.category_id].slug if doc.category_id in categories else None,
            category_name=categories[doc.category_id].name if doc.category_id in categories else None,
            title=doc.title,
            filename=doc.filename,
            content_type=doc.content_type,
            size_bytes=doc.size_bytes,
            uploaded_by_id=doc.uploaded_by_id,
            created_at=doc.created_at,
        )
        for doc in docs
    ]
    return items, total
async def upload_embedding_document(
    db: AsyncSession,
    *,
    project_id: UUID,
    category_id: UUID,
    title: str | None,
    file: UploadFile,
    uploaded_by_id: UUID | None,
) -> EmbeddingDocumentOut:
    doc = await embedding_document_service.create_document(
        db,
        project_id=project_id,
        category_id=category_id,
        title=title,
        file=file,
        uploaded_by_id=uploaded_by_id,
    )
    from app.tasks.embedding_tasks import schedule_embedding_document
    schedule_embedding_document(str(doc.id))
    category = await db.get(EmbeddingCategory, doc.category_id)
    return EmbeddingDocumentOut(
        id=doc.id,
        project_id=doc.project_id,
        category_id=doc.category_id,
        category_slug=category.slug if category else None,
        category_name=category.name if category else None,
        title=doc.title,
        filename=doc.filename,
        content_type=doc.content_type,
        size_bytes=doc.size_bytes,
        uploaded_by_id=doc.uploaded_by_id,
        created_at=doc.created_at,
    )

async def delete_embedding_document(db: AsyncSession, document_id: UUID) -> DeleteEmbeddingsOut:
    deleted = await embedding_document_service.delete_document(db, document_id)
    return DeleteEmbeddingsOut(deleted=deleted)
