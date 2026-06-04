"""Celery tasks for generating KB embeddings in the background."""
from __future__ import annotations

import asyncio

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from app.core.config import settings
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


async def _embed_kb_page_async(page_id: str) -> None:
    from app.models.kb_page import KBPage
    from app.models.kb_space import KBSpace
    from app.services.embedding_service import embed_and_store
    from app.services.llm.factory import is_embedding_configured

    if not is_embedding_configured():
        return

    factory = _get_async_session_factory()
    async with factory() as db:
        result = await db.execute(
            select(KBPage).where(KBPage.id == page_id)
        )
        page = result.scalar_one_or_none()
        if page is None:
            raise PageNotReadyError(f"KB page {page_id} not found")
        if page.is_deleted:
            return

        result = await db.execute(
            select(KBSpace).where(KBSpace.id == page.space_id)
        )
        space = result.scalar_one_or_none()
        if space is None:
            return

        text_content = page.content_markdown or ""
        if not text_content.strip():
            return

        metadata = await _build_page_metadata(db, page, space)

        count = await embed_and_store(
            db,
            project_id=space.project_id,
            content_type="kb_page",
            content_id=page.id,
            text_content=text_content,
            metadata=metadata,
        )
        await db.commit()
        logger.info("kb_page_embedded", page_id=page_id, chunks=count)


async def _embed_kb_attachment_async(attachment_id: str, page_id: str) -> None:
    from app.models.kb_attachment import KBPageAttachment
    from app.models.kb_page import KBPage
    from app.models.kb_space import KBSpace
    from app.services.embedding_service import embed_and_store
    from app.services.llm.factory import is_embedding_configured
    from app.services.text_extraction import extract_text_from_file

    if not is_embedding_configured():
        return

    factory = _get_async_session_factory()
    async with factory() as db:
        result = await db.execute(
            select(KBPageAttachment).where(KBPageAttachment.id == attachment_id)
        )
        attachment = result.scalar_one_or_none()
        if attachment is None:
            return

        result = await db.execute(
            select(KBPage).where(KBPage.id == page_id)
        )
        page = result.scalar_one_or_none()
        if page is None:
            return

        result = await db.execute(
            select(KBSpace).where(KBSpace.id == page.space_id)
        )
        space = result.scalar_one_or_none()
        if space is None:
            return

        file_bytes = await _download_s3_file(attachment.s3_key)
        if not file_bytes:
            return

        text_content = extract_text_from_file(
            file_bytes, attachment.content_type, attachment.filename
        )
        if not text_content.strip():
            return

        page_metadata = await _build_page_metadata(db, page, space)
        metadata = {
            **page_metadata,
            "source_type": "attachment",
            "page_id": str(page.id),
            "filename": attachment.filename,
            "file_content_type": attachment.content_type,
            "file_size_bytes": attachment.size_bytes,
        }

        count = await embed_and_store(
            db,
            project_id=space.project_id,
            content_type="kb_attachment",
            content_id=attachment.id,
            text_content=text_content,
            metadata=metadata,
        )
        await db.commit()
        logger.info(
            "kb_attachment_embedded",
            attachment_id=attachment_id,
            filename=attachment.filename,
            chunks=count,
        )


async def _download_s3_file(s3_key: str) -> bytes | None:
    """Download a file from S3 via the storage service."""
    from app.services.storage_service import StorageUnavailableError, get_object_bytes

    try:
        stored = await get_object_bytes(s3_key)
        return stored.body
    except StorageUnavailableError:
        logger.exception("s3_download_failed", s3_key=s3_key)
        return None


async def _delete_kb_embeddings_async(content_type: str, content_id: str) -> None:
    from app.services.embedding_service import delete_embeddings

    factory = _get_async_session_factory()
    async with factory() as db:
        count = await delete_embeddings(
            db, content_type=content_type, content_id=content_id
        )
        await db.commit()
        logger.info(
            "kb_embeddings_deleted",
            content_type=content_type,
            content_id=content_id,
            count=count,
        )


@celery_app.task(
    name="embed_kb_page",
    bind=True,
    ignore_result=True,
    max_retries=5,
    default_retry_delay=3,
)
def embed_kb_page(self, page_id: str) -> None:
    try:
        _run_async(_embed_kb_page_async(page_id))
    except PageNotReadyError as exc:
        raise self.retry(exc=exc) from exc


def schedule_kb_page_embedding(page_id: str) -> None:
    """Enqueue embedding generation, delayed so the caller's transaction can commit."""
    embed_kb_page.apply_async(args=[page_id], countdown=3)


@celery_app.task(name="embed_kb_attachment", ignore_result=True)
def embed_kb_attachment(attachment_id: str, page_id: str) -> None:
    _run_async(_embed_kb_attachment_async(attachment_id, page_id))


@celery_app.task(name="delete_kb_embeddings", ignore_result=True)
def delete_kb_embeddings(content_type: str, content_id: str) -> None:
    _run_async(_delete_kb_embeddings_async(content_type, content_id))


async def _reindex_project_embeddings_async(project_id: str) -> None:
    from app.models.kb_attachment import KBPageAttachment
    from app.models.kb_page import KBPage
    from app.models.kb_space import KBSpace

    factory = _get_async_session_factory()
    async with factory() as db:
        page_rows = (
            await db.execute(
                select(KBPage.id)
                .join(KBSpace, KBSpace.id == KBPage.space_id)
                .where(
                    KBSpace.project_id == project_id,
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

    pages_queued = 0
    for i, page_id in enumerate(page_ids):
        embed_kb_page.apply_async(args=[str(page_id)], countdown=3 + i)
        pages_queued += 1

    attachments_queued = 0
    base_countdown = 3 + pages_queued
    for i, (attachment_id, page_id) in enumerate(attachment_rows):
        embed_kb_attachment.apply_async(
            args=[str(attachment_id), str(page_id)],
            countdown=base_countdown + i,
        )
        attachments_queued += 1

    logger.info(
        "project_embeddings_reindex_queued",
        project_id=project_id,
        pages_queued=pages_queued,
        attachments_queued=attachments_queued,
    )


@celery_app.task(name="reindex_project_embeddings", ignore_result=True)
def reindex_project_embeddings(project_id: str) -> None:
    _run_async(_reindex_project_embeddings_async(project_id))
