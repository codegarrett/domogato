"""Tests for embedding category service."""
from __future__ import annotations

import uuid

import pytest
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ai_embedding import AIEmbedding
from app.models.project import Project
from app.services.embedding_category_service import (
    create_custom_category,
    delete_custom_category,
    ensure_system_categories,
    get_category_by_slug,
    list_categories,
)

DUMMY_VECTOR = [0.0] * 1536


@pytest.mark.asyncio
async def test_ensure_system_categories(db: AsyncSession, test_project: Project):
    cats = await ensure_system_categories(db, test_project.id)
    assert "knowledge_base" in cats
    assert "documents" in cats
    assert cats["knowledge_base"].is_system is True
    assert cats["documents"].is_system is True

    again = await ensure_system_categories(db, test_project.id)
    assert again["knowledge_base"].id == cats["knowledge_base"].id


@pytest.mark.asyncio
async def test_create_and_list_custom_category(db: AsyncSession, test_project: Project):
    await ensure_system_categories(db, test_project.id)
    cat = await create_custom_category(
        db,
        project_id=test_project.id,
        slug="runbooks",
        name="Runbooks",
        description="Operational runbooks",
    )
    assert cat.slug == "runbooks"
    assert cat.is_system is False

    rows = await list_categories(db, test_project.id)
    slugs = {c.slug for c, _ in rows}
    assert "runbooks" in slugs
    assert "knowledge_base" in slugs


@pytest.mark.asyncio
async def test_reject_reserved_slug(db: AsyncSession, test_project: Project):
    with pytest.raises(HTTPException) as exc:
        await create_custom_category(
            db,
            project_id=test_project.id,
            slug="knowledge_base",
            name="Fake KB",
        )
    assert exc.value.status_code == 400


@pytest.mark.asyncio
async def test_delete_custom_category_blocked_when_in_use(
    db: AsyncSession,
    test_project: Project,
):
    cats = await ensure_system_categories(db, test_project.id)
    custom = await create_custom_category(
        db,
        project_id=test_project.id,
        slug="contracts",
        name="Contracts",
    )

    db.add(
        AIEmbedding(
            project_id=test_project.id,
            category_id=custom.id,
            content_type="embedding_document",
            content_id=uuid.uuid4(),
            chunk_index=0,
            chunk_text="contract text",
            embedding=DUMMY_VECTOR,
            metadata_={},
        )
    )
    await db.flush()

    with pytest.raises(HTTPException) as exc:
        await delete_custom_category(db, custom.id)
    assert exc.value.status_code == 409

    with pytest.raises(HTTPException):
        await delete_custom_category(db, cats["knowledge_base"].id)


@pytest.mark.asyncio
async def test_get_category_by_slug(db: AsyncSession, test_project: Project):
    cat = await get_category_by_slug(db, test_project.id, "documents")
    assert cat is not None
    assert cat.slug == "documents"
