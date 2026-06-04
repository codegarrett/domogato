"""Celery tasks for generating embeddings in the background."""
from __future__ import annotations

import asyncio
from uuid import UUID

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from app.core.config import settings
from app.services.embedding_constants import (
    CONTENT_EMBEDDING_DOCUMENT,
    CONTENT_KB_ATTACHMENT,
    CONTENT_KB_PAGE,
    CONTENT_TICKET_ATTACHMENT,
    SYSTEM_DOCUMENTS,
    SYSTEM_KB,
    is_embeddable_file,
)
from app.tasks.celery_app import celery_app

logger = structlog.get_logger()


def _get_async_session_factory() -> async_sessionmaker[AsyncSession]:
    engine = create_async_engine(settings.DATABASE_URL, pool_pre_ping=True)
    return async_sessionmaker(engine, expire_on_commit=False)


def _run_async(coro):
    """Run an async coroutine from a sync Celery task."""
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


def _parse_uuid(value: str, label: str) -> UUID:
    try:
        return UUID(value)
    except ValueError as exc:
        raise ValueError(f"Invalid {label}: {value}") from exc


async def _get_category_id(db: AsyncSession, project_id: UUID, slug: str) -> UUID:
    from app.services.embedding_category_service import get_category_by_slug

    category = await get_category_by_slug(db, project_id, slug)
    if category is None:
        raise ValueError(f"Category '{slug}' not found for project {project_id}")
    return category.id


async def _build_page_metadata(db: AsyncSession, page, space) -> dict:
    """Build rich metadata including page hierarchy."""
    from app.services.kb_service import get_page_ancestors

    ancestors = await get_page_ancestors(db, page.id)
    return {
        "space_id": str(space.id),
        "space_name": space.name,
        "space_slug": space.slug,
        "page_title": page.title,
        "page_slug": page.slug,
        "parent_pages": [
            {"id": str(a["id"]), "title": a["title"], "slug": a["slug"]}
            for a in ancestors
        ],
        "source_type": "page_content",
    }


class PageNotReadyError(Exception):
    """Raised when a KB page is not yet visible (e.g. transaction not committed)."""


async def _download_s3_file(s3_key: str) -> bytes | None:
    """Download a file from S3 via the storage service."""
    from app.services.storage_service import StorageUnavailableError, get_object_bytes

    try:
        stored = await get_object_bytes(s3_key)
        return stored.body
    except StorageUnavailableError:
        logger.exception("s3_download_failed", s3_key=s3_key)
        return None


async def _embed_file_from_s3(
    db: AsyncSession,
    *,
    project_id: UUID,
    category_id: UUID,
    content_type: str,
    content_id: UUID,
    s3_key: str,
    filename: str,
    mime_type: str,
    metadata: dict,
) -> int:
    from app.services.embedding_service import embed_and_store
    from app.services.text_extraction import extract_text_from_file

    file_bytes = await _download_s3_file(s3_key)
    if not file_bytes:
        return -1

    text_content = extract_text_from_file(file_bytes, mime_type, filename)
    if not text_content.strip():
        return 0

    return await embed_and_store(
        db,
        project_id=project_id,
        category_id=category_id,
        content_type=content_type,
        content_id=content_id,
        text_content=text_content,
        metadata=metadata,
    )


async def _embed_kb_page_async(page_id: str) -> dict:
    from app.models.kb_page import KBPage
    from app.models.kb_space import KBSpace
    from app.services.embedding_service import embed_and_store
    from app.services.llm.factory import is_embedding_configured

    if not is_embedding_configured():
        logger.warning("embed_kb_page_skipped", page_id=page_id, reason="embedding_not_configured")
        return {"status": "skipped", "reason": "embedding_not_configured", "page_id": page_id}

    page_uuid = _parse_uuid(page_id, "page_id")
    factory = _get_async_session_factory()
    async with factory() as db:
        result = await db.execute(
            select(KBPage).where(KBPage.id == page_uuid)
        )
        page = result.scalar_one_or_none()
        if page is None:
            raise PageNotReadyError(f"KB page {page_id} not found")
        if page.is_deleted:
            logger.info("embed_kb_page_skipped", page_id=page_id, reason="page_deleted")
            return {"status": "skipped", "reason": "page_deleted", "page_id": page_id}

        result = await db.execute(
            select(KBSpace).where(KBSpace.id == page.space_id)
        )
        space = result.scalar_one_or_none()
        if space is None:
            logger.warning("embed_kb_page_skipped", page_id=page_id, reason="space_not_found")
            return {"status": "skipped", "reason": "space_not_found", "page_id": page_id}

        text_content = page.content_markdown or ""
        if not text_content.strip():
            logger.info(
                "embed_kb_page_skipped",
                page_id=page_id,
                reason="empty_content",
                page_title=page.title,
            )
            return {"status": "skipped", "reason": "empty_content", "page_id": page_id}

        metadata = await _build_page_metadata(db, page, space)
        category_id = await _get_category_id(db, space.project_id, SYSTEM_KB)

        count = await embed_and_store(
            db,
            project_id=space.project_id,
            category_id=category_id,
            content_type=CONTENT_KB_PAGE,
            content_id=page.id,
            text_content=text_content,
            metadata=metadata,
        )
        await db.commit()
        if count == 0:
            logger.error(
                "embed_kb_page_failed",
                page_id=page_id,
                page_title=page.title,
                reason="zero_chunks_stored",
            )
            return {"status": "failed", "reason": "zero_chunks_stored", "page_id": page_id}

        logger.info("kb_page_embedded", page_id=page_id, chunks=count, page_title=page.title)
        return {"status": "embedded", "page_id": page_id, "chunks": count}


async def _embed_kb_attachment_async(attachment_id: str, page_id: str) -> dict:
    from app.models.kb_attachment import KBPageAttachment
    from app.models.kb_page import KBPage
    from app.models.kb_space import KBSpace
    from app.services.llm.factory import is_embedding_configured

    if not is_embedding_configured():
        logger.warning(
            "embed_kb_attachment_skipped",
            attachment_id=attachment_id,
            reason="embedding_not_configured",
        )
        return {
            "status": "skipped",
            "reason": "embedding_not_configured",
            "attachment_id": attachment_id,
        }

    attachment_uuid = _parse_uuid(attachment_id, "attachment_id")
    page_uuid = _parse_uuid(page_id, "page_id")
    factory = _get_async_session_factory()
    async with factory() as db:
        result = await db.execute(
            select(KBPageAttachment).where(KBPageAttachment.id == attachment_uuid)
        )
        attachment = result.scalar_one_or_none()
        if attachment is None:
            logger.warning(
                "embed_kb_attachment_skipped",
                attachment_id=attachment_id,
                reason="attachment_not_found",
            )
            return {
                "status": "skipped",
                "reason": "attachment_not_found",
                "attachment_id": attachment_id,
            }

        result = await db.execute(
            select(KBPage).where(KBPage.id == page_uuid)
        )
        page = result.scalar_one_or_none()
        if page is None:
            logger.warning(
                "embed_kb_attachment_skipped",
                attachment_id=attachment_id,
                reason="page_not_found",
            )
            return {
                "status": "skipped",
                "reason": "page_not_found",
                "attachment_id": attachment_id,
            }

        result = await db.execute(
            select(KBSpace).where(KBSpace.id == page.space_id)
        )
        space = result.scalar_one_or_none()
        if space is None:
            logger.warning(
                "embed_kb_attachment_skipped",
                attachment_id=attachment_id,
                reason="space_not_found",
            )
            return {
                "status": "skipped",
                "reason": "space_not_found",
                "attachment_id": attachment_id,
            }

        page_metadata = await _build_page_metadata(db, page, space)
        metadata = {
            **page_metadata,
            "source_type": "attachment",
            "page_id": str(page.id),
            "filename": attachment.filename,
            "file_content_type": attachment.content_type,
            "file_size_bytes": attachment.size_bytes,
        }
        category_id = await _get_category_id(db, space.project_id, SYSTEM_KB)

        count = await _embed_file_from_s3(
            db,
            project_id=space.project_id,
            category_id=category_id,
            content_type=CONTENT_KB_ATTACHMENT,
            content_id=attachment.id,
            s3_key=attachment.s3_key,
            filename=attachment.filename,
            mime_type=attachment.content_type,
            metadata=metadata,
        )
        await db.commit()

        if count == -1:
            return {
                "status": "skipped",
                "reason": "s3_download_failed",
                "attachment_id": attachment_id,
            }
        if count == 0:
            logger.info(
                "embed_kb_attachment_skipped",
                attachment_id=attachment_id,
                reason="empty_extracted_text",
                filename=attachment.filename,
            )
            return {
                "status": "skipped",
                "reason": "empty_extracted_text",
                "attachment_id": attachment_id,
            }

        logger.info(
            "kb_attachment_embedded",
            attachment_id=attachment_id,
            filename=attachment.filename,
            chunks=count,
        )
        return {
            "status": "embedded",
            "attachment_id": attachment_id,
            "chunks": count,
        }


async def _embed_ticket_attachment_async(attachment_id: str) -> dict:
    from app.models.attachment import Attachment
    from app.models.ticket import Ticket
    from app.models.project import Project
    from app.services.llm.factory import is_embedding_configured

    if not is_embedding_configured():
        logger.warning(
            "embed_ticket_attachment_skipped",
            attachment_id=attachment_id,
            reason="embedding_not_configured",
        )
        return {
            "status": "skipped",
            "reason": "embedding_not_configured",
            "attachment_id": attachment_id,
        }

    attachment_uuid = _parse_uuid(attachment_id, "attachment_id")
    factory = _get_async_session_factory()
    async with factory() as db:
        attachment = await db.get(Attachment, attachment_uuid)
        if attachment is None:
            logger.warning(
                "embed_ticket_attachment_skipped",
                attachment_id=attachment_id,
                reason="attachment_not_found",
            )
            return {
                "status": "skipped",
                "reason": "attachment_not_found",
                "attachment_id": attachment_id,
            }

        if not is_embeddable_file(attachment.content_type, attachment.filename):
            return {
                "status": "skipped",
                "reason": "not_embeddable",
                "attachment_id": attachment_id,
            }

        ticket = await db.get(Ticket, attachment.ticket_id)
        project = await db.get(Project, attachment.project_id)
        if ticket is None or project is None:
            return {
                "status": "skipped",
                "reason": "ticket_or_project_not_found",
                "attachment_id": attachment_id,
            }

        metadata = {
            "ticket_id": str(ticket.id),
            "ticket_number": ticket.ticket_number,
            "project_key": project.key,
            "filename": attachment.filename,
            "file_content_type": attachment.content_type,
            "file_size_bytes": attachment.size_bytes,
            "source_type": CONTENT_TICKET_ATTACHMENT,
        }
        category_id = await _get_category_id(db, attachment.project_id, SYSTEM_DOCUMENTS)

        count = await _embed_file_from_s3(
            db,
            project_id=attachment.project_id,
            category_id=category_id,
            content_type=CONTENT_TICKET_ATTACHMENT,
            content_id=attachment.id,
            s3_key=attachment.s3_key,
            filename=attachment.filename,
            mime_type=attachment.content_type,
            metadata=metadata,
        )
        await db.commit()

        if count == -1:
            return {
                "status": "skipped",
                "reason": "s3_download_failed",
                "attachment_id": attachment_id,
            }
        if count == 0:
            return {
                "status": "skipped",
                "reason": "empty_extracted_text",
                "attachment_id": attachment_id,
            }

        logger.info(
            "ticket_attachment_embedded",
            attachment_id=attachment_id,
            filename=attachment.filename,
            chunks=count,
        )
        return {
            "status": "embedded",
            "attachment_id": attachment_id,
            "chunks": count,
        }


async def _embed_embedding_document_async(document_id: str) -> dict:
    from app.models.embedding_document import EmbeddingDocument
    from app.services.llm.factory import is_embedding_configured

    if not is_embedding_configured():
        logger.warning(
            "embed_embedding_document_skipped",
            document_id=document_id,
            reason="embedding_not_configured",
        )
        return {
            "status": "skipped",
            "reason": "embedding_not_configured",
            "document_id": document_id,
        }

    document_uuid = _parse_uuid(document_id, "document_id")
    factory = _get_async_session_factory()
    async with factory() as db:
        doc = await db.get(EmbeddingDocument, document_uuid)
        if doc is None:
            return {
                "status": "skipped",
                "reason": "document_not_found",
                "document_id": document_id,
            }

        metadata = {
            "title": doc.title,
            "filename": doc.filename,
            "file_content_type": doc.content_type,
            "file_size_bytes": doc.size_bytes,
            "source_type": CONTENT_EMBEDDING_DOCUMENT,
        }

        count = await _embed_file_from_s3(
            db,
            project_id=doc.project_id,
            category_id=doc.category_id,
            content_type=CONTENT_EMBEDDING_DOCUMENT,
            content_id=doc.id,
            s3_key=doc.s3_key,
            filename=doc.filename,
            mime_type=doc.content_type,
            metadata=metadata,
        )
        await db.commit()

        if count == -1:
            return {
                "status": "skipped",
                "reason": "s3_download_failed",
                "document_id": document_id,
            }
        if count == 0:
            return {
                "status": "skipped",
                "reason": "empty_extracted_text",
                "document_id": document_id,
            }

        logger.info(
            "embedding_document_embedded",
            document_id=document_id,
            title=doc.title,
            chunks=count,
        )
        return {
            "status": "embedded",
            "document_id": document_id,
            "chunks": count,
        }


async def _delete_embeddings_async(content_type: str, content_id: str) -> dict:
    from app.services.embedding_service import delete_embeddings

    content_uuid = _parse_uuid(content_id, "content_id")
    factory = _get_async_session_factory()
    async with factory() as db:
        count = await delete_embeddings(
            db, content_type=content_type, content_id=content_uuid
        )
        await db.commit()
        logger.info(
            "embeddings_deleted",
            content_type=content_type,
            content_id=content_id,
            count=count,
        )
        return {
            "status": "deleted",
            "content_type": content_type,
            "content_id": content_id,
            "deleted": count,
        }


@celery_app.task(
    name="embed_kb_page",
    bind=True,
    max_retries=5,
    default_retry_delay=3,
)
def embed_kb_page(self, page_id: str) -> dict:
    try:
        return _run_async(_embed_kb_page_async(page_id))
    except PageNotReadyError as exc:
        raise self.retry(exc=exc) from exc


def schedule_kb_page_embedding(page_id: str) -> None:
    """Enqueue embedding generation, delayed so the caller's transaction can commit."""
    embed_kb_page.apply_async(args=[page_id], countdown=3)


@celery_app.task(name="embed_kb_attachment")
def embed_kb_attachment(attachment_id: str, page_id: str) -> dict:
    return _run_async(_embed_kb_attachment_async(attachment_id, page_id))


@celery_app.task(name="embed_ticket_attachment")
def embed_ticket_attachment(attachment_id: str) -> dict:
    return _run_async(_embed_ticket_attachment_async(attachment_id))


def schedule_ticket_attachment_embedding(attachment_id: str) -> None:
    embed_ticket_attachment.apply_async(args=[attachment_id], countdown=3)


@celery_app.task(name="embed_embedding_document")
def embed_embedding_document(document_id: str) -> dict:
    return _run_async(_embed_embedding_document_async(document_id))


def schedule_embedding_document(document_id: str) -> None:
    embed_embedding_document.apply_async(args=[document_id], countdown=3)


@celery_app.task(name="delete_kb_embeddings")
def delete_kb_embeddings(content_type: str, content_id: str) -> dict:
    return _run_async(_delete_embeddings_async(content_type, content_id))


async def _reindex_project_embeddings_async(
    project_id: str,
    category_slug: str | None = None,
) -> dict:
    from app.models.attachment import Attachment
    from app.models.embedding_document import EmbeddingDocument
    from app.models.kb_attachment import KBPageAttachment
    from app.models.kb_page import KBPage
    from app.models.kb_space import KBSpace
    from app.services.llm.factory import is_embedding_configured

    project_uuid = _parse_uuid(project_id, "project_id")
    slug = category_slug or SYSTEM_KB

    if not is_embedding_configured():
        logger.warning(
            "reindex_project_skipped",
            project_id=project_id,
            reason="embedding_not_configured",
        )
        return {
            "status": "skipped",
            "reason": "embedding_not_configured",
            "project_id": project_id,
            "category_slug": slug,
            "pages_queued": 0,
            "attachments_queued": 0,
            "documents_queued": 0,
        }

    factory = _get_async_session_factory()
    pages_queued = 0
    attachments_queued = 0
    documents_queued = 0

    if slug == SYSTEM_KB:
        async with factory() as db:
            page_rows = (
                await db.execute(
                    select(KBPage.id)
                    .join(KBSpace, KBSpace.id == KBPage.space_id)
                    .where(
                        KBSpace.project_id == project_uuid,
                        KBPage.is_deleted.is_(False),
                        KBPage.content_markdown.isnot(None),
                        KBPage.content_markdown != "",
                    )
                )
            ).all()
            page_ids = [row[0] for row in page_rows]

            attachment_rows = (
                await db.execute(
                    select(KBPageAttachment.id, KBPageAttachment.page_id).where(
                        KBPageAttachment.page_id.in_(page_ids)
                    )
                )
            ).all() if page_ids else []

        for i, pid in enumerate(page_ids):
            embed_kb_page.apply_async(args=[str(pid)], countdown=3 + i)
            pages_queued += 1

        base_countdown = 3 + pages_queued
        for i, (attachment_id, pid) in enumerate(attachment_rows):
            embed_kb_attachment.apply_async(
                args=[str(attachment_id), str(pid)],
                countdown=base_countdown + i,
            )
            attachments_queued += 1

    elif slug == SYSTEM_DOCUMENTS:
        async with factory() as db:
            ticket_attachments = (
                await db.execute(
                    select(Attachment.id).where(Attachment.project_id == project_uuid)
                )
            ).all()
            manual_docs = (
                await db.execute(
                    select(EmbeddingDocument.id).where(
                        EmbeddingDocument.project_id == project_uuid
                    )
                )
            ).all()

        base = 3
        for i, (attachment_id,) in enumerate(ticket_attachments):
            embed_ticket_attachment.apply_async(
                args=[str(attachment_id)],
                countdown=base + i,
            )
            attachments_queued += 1

        base += attachments_queued
        for i, (doc_id,) in enumerate(manual_docs):
            embed_embedding_document.apply_async(
                args=[str(doc_id)],
                countdown=base + i,
            )
            documents_queued += 1
    else:
        async with factory() as db:
            from app.services.embedding_category_service import get_category_by_slug

            category = await get_category_by_slug(db, project_uuid, slug)
            if category is None:
                return {
                    "status": "skipped",
                    "reason": "category_not_found",
                    "project_id": project_id,
                    "category_slug": slug,
                    "pages_queued": 0,
                    "attachments_queued": 0,
                    "documents_queued": 0,
                }
            manual_docs = (
                await db.execute(
                    select(EmbeddingDocument.id).where(
                        EmbeddingDocument.project_id == project_uuid,
                        EmbeddingDocument.category_id == category.id,
                    )
                )
            ).all()

        for i, (doc_id,) in enumerate(manual_docs):
            embed_embedding_document.apply_async(
                args=[str(doc_id)],
                countdown=3 + i,
            )
            documents_queued += 1

    total = pages_queued + attachments_queued + documents_queued
    if total == 0:
        logger.warning(
            "reindex_project_no_sources",
            project_id=project_id,
            category_slug=slug,
        )
    else:
        logger.info(
            "project_embeddings_reindex_queued",
            project_id=project_id,
            category_slug=slug,
            pages_queued=pages_queued,
            attachments_queued=attachments_queued,
            documents_queued=documents_queued,
        )

    return {
        "status": "queued",
        "project_id": project_id,
        "category_slug": slug,
        "pages_queued": pages_queued,
        "attachments_queued": attachments_queued,
        "documents_queued": documents_queued,
    }


@celery_app.task(name="reindex_project_embeddings")
def reindex_project_embeddings(project_id: str, category_slug: str | None = None) -> dict:
    return _run_async(_reindex_project_embeddings_async(project_id, category_slug))
