from __future__ import annotations

import re
from uuid import UUID

from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.kb_space import KBSpace
from app.models.kb_page import KBPage
from app.models.kb_page_version import KBPageVersion
from app.schemas.kb import SpaceCreate, SpaceUpdate, PageCreate, PageUpdate, PageMoveRequest


# ---------------------------------------------------------------------------
# Slug helpers
# ---------------------------------------------------------------------------

def generate_slug(text: str) -> str:
    slug = text.lower()
    slug = re.sub(r"[^a-z0-9]+", "-", slug)
    slug = slug.strip("-")
    return slug[:100]


async def ensure_unique_slug(
    db: AsyncSession,
    model_class: type,
    scope_column: str,
    scope_id: UUID,
    base_slug: str,
) -> str:
    slug = base_slug
    suffix = 2
    while True:
        stmt = select(func.count()).select_from(model_class).where(
            and_(
                getattr(model_class, scope_column) == scope_id,
                model_class.slug == slug,
            )
        )
        count = (await db.execute(stmt)).scalar_one()
        if count == 0:
            return slug
        slug = f"{base_slug}-{suffix}"[:100]
        suffix += 1


# ---------------------------------------------------------------------------
# Spaces
# ---------------------------------------------------------------------------

async def list_spaces(
    db: AsyncSession,
    project_id: UUID,
    *,
    include_archived: bool = False,
) -> list[KBSpace]:
    stmt = select(KBSpace).where(KBSpace.project_id == project_id)
    if not include_archived:
        stmt = stmt.where(KBSpace.is_archived == False)  # noqa: E712
    stmt = stmt.order_by(KBSpace.position)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def create_space(
    db: AsyncSession,
    project_id: UUID,
    data: SpaceCreate,
    user_id: UUID | None = None,
) -> KBSpace:
    base_slug = generate_slug(data.name)
    slug = await ensure_unique_slug(db, KBSpace, "project_id", project_id, base_slug)

    max_pos = (
        await db.execute(
            select(func.coalesce(func.max(KBSpace.position), -1))
            .where(KBSpace.project_id == project_id)
        )
    ).scalar_one()

    space = KBSpace(
        project_id=project_id,
        name=data.name,
        description=data.description,
        slug=slug,
        icon=data.icon,
        position=max_pos + 1,
        created_by=user_id,
    )
    db.add(space)
    await db.flush()
    await db.refresh(space)
    return space


async def get_space_by_slug(
    db: AsyncSession, project_id: UUID, slug: str
) -> KBSpace | None:
    result = await db.execute(
        select(KBSpace).where(
            KBSpace.project_id == project_id,
            KBSpace.slug == slug,
        )
    )
    return result.scalar_one_or_none()


async def get_space_by_id(db: AsyncSession, space_id: UUID) -> KBSpace | None:
    result = await db.execute(
        select(KBSpace).where(KBSpace.id == space_id)
    )
    return result.scalar_one_or_none()


async def update_space(
    db: AsyncSession, space: KBSpace, data: SpaceUpdate
) -> KBSpace:
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(space, key, value)
    await db.flush()
    await db.refresh(space)
    return space


async def archive_space(db: AsyncSession, space: KBSpace) -> KBSpace:
    space.is_archived = True
    await db.flush()
    await db.refresh(space)
    return space


# ---------------------------------------------------------------------------
# Pages
# ---------------------------------------------------------------------------

async def create_page(
    db: AsyncSession,
    space_id: UUID,
    data: PageCreate,
    user_id: UUID | None = None,
) -> KBPage:
    base_slug = generate_slug(data.title)
    slug = await ensure_unique_slug(db, KBPage, "space_id", space_id, base_slug)

    max_pos = (
        await db.execute(
            select(func.coalesce(func.max(KBPage.position), -1)).where(
                and_(
                    KBPage.space_id == space_id,
                    KBPage.parent_page_id == data.parent_page_id,
                    KBPage.is_deleted == False,  # noqa: E712
                )
            )
        )
    ).scalar_one()

    page = KBPage(
        space_id=space_id,
        parent_page_id=data.parent_page_id,
        title=data.title,
        slug=slug,
        content_markdown=data.content_markdown,
        content_html=data.content_html,
        position=max_pos + 1,
        is_published=data.is_published,
        created_by=user_id,
        last_edited_by=user_id,
    )
    db.add(page)
    await db.flush()
    await db.refresh(page)

    version = KBPageVersion(
        page_id=page.id,
        version_number=1,
        title=page.title,
        content_markdown=page.content_markdown,
        content_html=page.content_html,
        change_summary="Initial version",
        created_by=user_id,
    )
    db.add(version)
    await db.flush()

    if getattr(data, "page_type", None):
        from app.services.kb_story_service import get_initial_status, upsert_page_meta
        space = await get_space_by_id(db, space_id)
        if space:
            initial_status = await get_initial_status(db, space.project_id)
            await upsert_page_meta(
                db,
                page_id=page.id,
                project_id=space.project_id,
                page_type=data.page_type,
                status_id=initial_status.id if initial_status else None,
            )

    return page


async def get_page(db: AsyncSession, page_id: UUID) -> KBPage | None:
    result = await db.execute(
        select(KBPage).where(KBPage.id == page_id)
    )
    return result.scalar_one_or_none()


async def update_page(
    db: AsyncSession,
    page: KBPage,
    data: PageUpdate,
    user_id: UUID | None = None,
) -> KBPage:
    update_data = data.model_dump(exclude_unset=True)
    change_summary = update_data.pop("change_summary", None)

    for key, value in update_data.items():
        setattr(page, key, value)
    page.last_edited_by = user_id
    await db.flush()
    await db.refresh(page)

    max_ver = (
        await db.execute(
            select(func.coalesce(func.max(KBPageVersion.version_number), 0))
            .where(KBPageVersion.page_id == page.id)
        )
    ).scalar_one()

    version = KBPageVersion(
        page_id=page.id,
        version_number=max_ver + 1,
        title=page.title,
        content_markdown=page.content_markdown,
        content_html=page.content_html,
        change_summary=change_summary,
        created_by=user_id,
    )
    db.add(version)
    await db.flush()

    return page


async def delete_page(db: AsyncSession, page: KBPage) -> KBPage:
    page.is_deleted = True
    await db.flush()
    await db.refresh(page)
    return page


async def move_page(
    db: AsyncSession, page: KBPage, data: PageMoveRequest
) -> KBPage:
    page.parent_page_id = data.parent_page_id
    page.position = data.position
    await db.flush()
    await db.refresh(page)
    return page


async def get_page_tree(db: AsyncSession, space_id: UUID) -> list[dict]:
    result = await db.execute(
        select(KBPage)
        .where(
            KBPage.space_id == space_id,
            KBPage.is_deleted == False,  # noqa: E712
        )
        .order_by(KBPage.position)
    )
    pages = result.scalars().all()

    nodes: dict[UUID, dict] = {}
    for p in pages:
        nodes[p.id] = {
            "id": p.id,
            "title": p.title,
            "slug": p.slug,
            "position": p.position,
            "is_published": p.is_published,
            "children": [],
        }

    roots: list[dict] = []
    for p in pages:
        node = nodes[p.id]
        if p.parent_page_id and p.parent_page_id in nodes:
            nodes[p.parent_page_id]["children"].append(node)
        else:
            roots.append(node)

    return roots


async def get_page_children(db: AsyncSession, page_id: UUID) -> list[KBPage]:
    result = await db.execute(
        select(KBPage)
        .where(
            KBPage.parent_page_id == page_id,
            KBPage.is_deleted == False,  # noqa: E712
        )
        .order_by(KBPage.position)
    )
    return list(result.scalars().all())


async def get_page_ancestors(db: AsyncSession, page_id: UUID) -> list[dict]:
    ancestors: list[dict] = []
    current_id: UUID | None = page_id

    while current_id is not None:
        result = await db.execute(
            select(KBPage).where(KBPage.id == current_id)
        )
        page = result.scalar_one_or_none()
        if page is None:
            break
        if page.id != page_id:
            ancestors.append({
                "id": page.id,
                "title": page.title,
                "slug": page.slug,
            })
        current_id = page.parent_page_id

    ancestors.reverse()
    return ancestors
