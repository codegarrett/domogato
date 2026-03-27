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
        if page is None or page.is_deleted:
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
    """Download a file from S3 using aioboto3."""
    import aioboto3

    session = aioboto3.Session()
    try:
        async with session.client(
            "s3",
            endpoint_url=settings.S3_ENDPOINT_URL,
            aws_access_key_id=settings.S3_ACCESS_KEY_ID,
            aws_secret_access_key=settings.S3_SECRET_ACCESS_KEY,
        ) as s3:
            response = await s3.get_object(
                Bucket=settings.S3_BUCKET_NAME,
                Key=s3_key,
            )
            return await response["Body"].read()
    except Exception:
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


@celery_app.task(name="embed_kb_page", ignore_result=True)
def embed_kb_page(page_id: str) -> None:
    _run_async(_embed_kb_page_async(page_id))


@celery_app.task(name="embed_kb_attachment", ignore_result=True)
def embed_kb_attachment(attachment_id: str, page_id: str) -> None:
    _run_async(_embed_kb_attachment_async(attachment_id, page_id))


@celery_app.task(name="delete_kb_embeddings", ignore_result=True)
def delete_kb_embeddings(content_type: str, content_id: str) -> None:
    _run_async(_delete_kb_embeddings_async(content_type, content_id))
