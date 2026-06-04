"""CRUD and seeding for project-scoped embedding categories."""
from __future__ import annotations

import re
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ai_embedding import AIEmbedding
from app.models.embedding_category import EmbeddingCategory
from app.models.project import Project
from app.services.embedding_constants import SYSTEM_CATEGORIES, SYSTEM_CATEGORY_SLUGS

_SLUG_RE = re.compile(r"^[a-z][a-z0-9_-]{1,98}[a-z0-9]$")


async def ensure_system_categories(
    db: AsyncSession, project_id: UUID
) -> dict[str, EmbeddingCategory]:
    """Ensure system categories exist for a project. Returns slug -> category map."""
    result = await db.execute(
        select(EmbeddingCategory).where(EmbeddingCategory.project_id == project_id)
    )
    existing = {c.slug: c for c in result.scalars()}

    for slug, name, description in SYSTEM_CATEGORIES:
        if slug not in existing:
            cat = EmbeddingCategory(
                project_id=project_id,
                slug=slug,
                name=name,
                description=description,
                is_system=True,
            )
            db.add(cat)
            existing[slug] = cat

    await db.flush()
    return existing


async def get_category_by_slug(
    db: AsyncSession, project_id: UUID, slug: str
) -> EmbeddingCategory | None:
    await ensure_system_categories(db, project_id)
    result = await db.execute(
        select(EmbeddingCategory).where(
            EmbeddingCategory.project_id == project_id,
            EmbeddingCategory.slug == slug,
        )
    )
    return result.scalar_one_or_none()


async def list_categories(
    db: AsyncSession, project_id: UUID
) -> list[tuple[EmbeddingCategory, int]]:
    await ensure_system_categories(db, project_id)
    rows = (
        await db.execute(
            select(
                EmbeddingCategory,
                func.count(AIEmbedding.id),
            )
            .outerjoin(
                AIEmbedding,
                AIEmbedding.category_id == EmbeddingCategory.id,
            )
            .where(EmbeddingCategory.project_id == project_id)
            .group_by(EmbeddingCategory.id)
            .order_by(EmbeddingCategory.is_system.desc(), EmbeddingCategory.name)
        )
    ).all()
    return [(row[0], row[1]) for row in rows]


async def create_custom_category(
    db: AsyncSession,
    *,
    project_id: UUID,
    slug: str,
    name: str,
    description: str | None = None,
) -> EmbeddingCategory:
    project = await db.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    slug = slug.strip().lower()
    if slug in SYSTEM_CATEGORY_SLUGS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Slug '{slug}' is reserved for a system category",
        )
    if not _SLUG_RE.match(slug):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Slug must be 3-100 chars: lowercase letters, digits, hyphens, underscores",
        )

    await ensure_system_categories(db, project_id)

    existing = await db.execute(
        select(EmbeddingCategory).where(
            EmbeddingCategory.project_id == project_id,
            EmbeddingCategory.slug == slug,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Category slug '{slug}' already exists in this project",
        )

    cat = EmbeddingCategory(
        project_id=project_id,
        slug=slug,
        name=name.strip(),
        description=description,
        is_system=False,
    )
    db.add(cat)
    await db.flush()
    return cat


async def delete_custom_category(db: AsyncSession, category_id: UUID) -> None:
    cat = await db.get(EmbeddingCategory, category_id)
    if cat is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    if cat.is_system:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="System categories cannot be deleted",
        )

    count_result = await db.execute(
        select(func.count()).select_from(AIEmbedding).where(
            AIEmbedding.category_id == category_id
        )
    )
    if count_result.scalar_one() > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Category has embeddings and cannot be deleted",
        )

    await db.execute(
        delete(EmbeddingCategory).where(EmbeddingCategory.id == category_id)
    )
    await db.flush()
