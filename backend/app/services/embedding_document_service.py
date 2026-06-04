"""Admin manual embedding document uploads."""
from __future__ import annotations

from uuid import UUID

from fastapi import HTTPException, UploadFile, status
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.embedding_category import EmbeddingCategory
from app.models.embedding_document import EmbeddingDocument
from app.models.project import Project
from app.services import storage_service
from app.services.embedding_constants import is_embeddable_file
from app.services.embedding_service import delete_embeddings


async def list_documents(
    db: AsyncSession,
    *,
    project_id: UUID,
    category_id: UUID | None = None,
    offset: int = 0,
    limit: int = 50,
) -> tuple[list[EmbeddingDocument], int]:
    base = select(EmbeddingDocument).where(EmbeddingDocument.project_id == project_id)
    count_base = select(func.count()).select_from(EmbeddingDocument).where(
        EmbeddingDocument.project_id == project_id
    )

    if category_id is not None:
        base = base.where(EmbeddingDocument.category_id == category_id)
        count_base = count_base.where(EmbeddingDocument.category_id == category_id)

    total = (await db.execute(count_base)).scalar_one()
    rows = (
        await db.execute(
            base.order_by(EmbeddingDocument.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
    ).scalars().all()
    return list(rows), total


async def create_document(
    db: AsyncSession,
    *,
    project_id: UUID,
    category_id: UUID,
    title: str | None,
    file: UploadFile,
    uploaded_by_id: UUID | None,
) -> EmbeddingDocument:
    project = await db.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    category = await db.get(EmbeddingCategory, category_id)
    if category is None or category.project_id != project_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

    if not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Filename is required")

    content_type = file.content_type or "application/octet-stream"
    if not is_embeddable_file(content_type, file.filename):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File type is not supported for embedding",
        )

    body = await file.read()
    if not body:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty file")
    if len(body) > storage_service.MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum size of {storage_service.MAX_FILE_SIZE} bytes",
        )

    s3_key = storage_service.generate_s3_key(f"embeddings/{project_id}", file.filename)
    await storage_service.put_object(s3_key, body, content_type)

    doc = EmbeddingDocument(
        project_id=project_id,
        category_id=category_id,
        title=(title or file.filename).strip(),
        filename=file.filename,
        content_type=content_type,
        size_bytes=len(body),
        s3_key=s3_key,
        uploaded_by_id=uploaded_by_id,
    )
    db.add(doc)
    await db.flush()
    await db.refresh(doc)
    return doc


async def delete_document(db: AsyncSession, document_id: UUID) -> int:
    doc = await db.get(EmbeddingDocument, document_id)
    if doc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    from app.services.embedding_constants import CONTENT_EMBEDDING_DOCUMENT

    deleted = await delete_embeddings(
        db,
        content_type=CONTENT_EMBEDDING_DOCUMENT,
        content_id=document_id,
    )
    await storage_service.delete_object(doc.s3_key)
    await db.execute(
        delete(EmbeddingDocument).where(EmbeddingDocument.id == document_id)
    )
    await db.flush()
    return deleted
