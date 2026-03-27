from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.core.permissions import (
    PROJECT_ROLE_HIERARCHY,
    ProjectRole,
    require_project_role,
    resolve_effective_project_role,
)
from app.models.kb_comment import KBPageComment
from app.models.kb_page import KBPage
from app.models.kb_page_version import KBPageVersion
from app.models.kb_space import KBSpace
from app.models.project import Project
from app.models.user import User
from app.schemas.kb import (
    PageAncestor,
    PageCreate,
    PageMetaBrief,
    PageMoveRequest,
    PageRead,
    PageTreeNode,
    PageUpdate,
    RecentPageRead,
)
from app.services import kb_service, kb_story_service
from app.tasks.embedding_tasks import embed_kb_page, delete_kb_embeddings

router = APIRouter(tags=["knowledge-base"])


@router.get(
    "/projects/{project_id}/kb/recent-pages",
    response_model=list[RecentPageRead],
)
async def list_recent_pages(
    project_id: UUID,
    limit: int = Query(10, ge=1, le=25),
    _role: ProjectRole = require_project_role(ProjectRole.GUEST),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(
            KBPage.id,
            KBPage.title,
            KBPage.slug,
            KBSpace.name.label("space_name"),
            KBSpace.slug.label("space_slug"),
            KBPage.updated_at,
            User.display_name.label("last_edited_by_name"),
        )
        .join(KBSpace, KBSpace.id == KBPage.space_id)
        .outerjoin(User, User.id == KBPage.last_edited_by)
        .where(
            KBSpace.project_id == project_id,
            KBPage.is_deleted == False,  # noqa: E712
            KBPage.is_published == True,  # noqa: E712
        )
        .order_by(KBPage.updated_at.desc())
        .limit(limit)
    )
    rows = (await db.execute(stmt)).all()
    return [
        RecentPageRead(
            id=row.id,
            title=row.title,
            slug=row.slug,
            space_name=row.space_name,
            space_slug=row.space_slug,
            updated_at=row.updated_at,
            last_edited_by_name=row.last_edited_by_name,
        )
        for row in rows
    ]


async def _require_kb_role(
    db: AsyncSession,
    space_or_page: KBSpace | KBPage,
    user: User,
    min_role: ProjectRole,
) -> None:
    if user.is_system_admin:
        return

    if isinstance(space_or_page, KBPage):
        space = await kb_service.get_space_by_id(db, space_or_page.space_id)
        if space is None:
            raise HTTPException(status_code=404, detail="Space not found")
        project_id = space.project_id
    else:
        project_id = space_or_page.project_id

    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    effective = await resolve_effective_project_role(
        user_id=user.id,
        project_id=project_id,
        organization_id=project.organization_id,
        project_visibility=project.visibility,
        is_system_admin=user.is_system_admin,
        db=db,
    )
    if effective is None or PROJECT_ROLE_HIERARCHY[effective] < PROJECT_ROLE_HIERARCHY[min_role]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions",
        )


async def _get_space_or_404(db: AsyncSession, space_id: UUID) -> KBSpace:
    space = await kb_service.get_space_by_id(db, space_id)
    if space is None:
        raise HTTPException(status_code=404, detail="Space not found")
    return space


async def _get_page_or_404(db: AsyncSession, page_id: UUID) -> KBPage:
    page = await kb_service.get_page(db, page_id)
    if page is None or page.is_deleted:
        raise HTTPException(status_code=404, detail="Page not found")
    return page


async def _enrich_page_read(db: AsyncSession, page: KBPage) -> PageRead:
    version_count = (
        await db.execute(
            select(func.count())
            .select_from(KBPageVersion)
            .where(KBPageVersion.page_id == page.id)
        )
    ).scalar_one()

    comment_count = (
        await db.execute(
            select(func.count())
            .select_from(KBPageComment)
            .where(
                KBPageComment.page_id == page.id,
                KBPageComment.is_deleted == False,  # noqa: E712
            )
        )
    ).scalar_one()

    page_dict = {
        "id": page.id,
        "space_id": page.space_id,
        "parent_page_id": page.parent_page_id,
        "title": page.title,
        "slug": page.slug,
        "content_markdown": page.content_markdown,
        "content_html": page.content_html,
        "position": page.position,
        "is_published": page.is_published,
        "is_deleted": page.is_deleted,
        "created_by": page.created_by,
        "last_edited_by": page.last_edited_by,
        "created_at": page.created_at,
        "updated_at": page.updated_at,
    }
    result = PageRead(**page_dict)
    result.version_count = version_count
    result.comment_count = comment_count

    meta = await kb_story_service.get_page_meta(db, page.id)
    if meta is not None:
        link_count = len(meta.ticket_links) if meta.ticket_links else 0
        story_status_dict = None
        if meta.story_status:
            story_status_dict = {
                "id": str(meta.story_status.id),
                "name": meta.story_status.name,
                "category": meta.story_status.category,
                "color": meta.story_status.color,
            }
        result.meta = PageMetaBrief(
            id=meta.id,
            page_type=meta.page_type,
            story_workflow_status_id=meta.story_workflow_status_id,
            story_status=story_status_dict,
            ticket_link_count=link_count,
        )

    return result


@router.get(
    "/kb/spaces/{space_id}/pages",
    response_model=list[PageTreeNode],
)
async def get_page_tree(
    space_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    space = await _get_space_or_404(db, space_id)
    await _require_kb_role(db, space, user, ProjectRole.GUEST)
    tree = await kb_service.get_page_tree(db, space_id)
    return [PageTreeNode(**node) for node in tree]


@router.post(
    "/kb/spaces/{space_id}/pages",
    response_model=PageRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_page(
    space_id: UUID,
    body: PageCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    space = await _get_space_or_404(db, space_id)
    await _require_kb_role(db, space, user, ProjectRole.DEVELOPER)
    page = await kb_service.create_page(db, space_id, body, user_id=user.id)
    result = await _enrich_page_read(db, page)
    embed_kb_page.delay(str(page.id))
    return result


@router.get(
    "/kb/pages/{page_id}",
    response_model=PageRead,
)
async def get_page(
    page_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    page = await _get_page_or_404(db, page_id)
    await _require_kb_role(db, page, user, ProjectRole.GUEST)
    return await _enrich_page_read(db, page)


@router.patch(
    "/kb/pages/{page_id}",
    response_model=PageRead,
)
async def update_page(
    page_id: UUID,
    body: PageUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    page = await _get_page_or_404(db, page_id)
    await _require_kb_role(db, page, user, ProjectRole.DEVELOPER)
    updated = await kb_service.update_page(db, page, body, user_id=user.id)
    result = await _enrich_page_read(db, updated)
    embed_kb_page.delay(str(updated.id))
    return result


@router.delete(
    "/kb/pages/{page_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_page(
    page_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    page = await _get_page_or_404(db, page_id)
    await _require_kb_role(db, page, user, ProjectRole.MAINTAINER)
    await kb_service.delete_page(db, page)
    delete_kb_embeddings.delay("kb_page", str(page_id))


@router.post(
    "/kb/pages/{page_id}/move",
    response_model=PageRead,
)
async def move_page(
    page_id: UUID,
    body: PageMoveRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    page = await _get_page_or_404(db, page_id)
    await _require_kb_role(db, page, user, ProjectRole.DEVELOPER)
    moved = await kb_service.move_page(db, page, body)
    return await _enrich_page_read(db, moved)


@router.get(
    "/kb/pages/{page_id}/children",
    response_model=list[PageRead],
)
async def get_children(
    page_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    page = await _get_page_or_404(db, page_id)
    await _require_kb_role(db, page, user, ProjectRole.GUEST)
    children = await kb_service.get_page_children(db, page_id)
    return [await _enrich_page_read(db, c) for c in children]


@router.get(
    "/kb/pages/{page_id}/ancestors",
    response_model=list[PageAncestor],
)
async def get_ancestors(
    page_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    page = await _get_page_or_404(db, page_id)
    await _require_kb_role(db, page, user, ProjectRole.GUEST)
    ancestors = await kb_service.get_page_ancestors(db, page_id)
    return [PageAncestor(**a) for a in ancestors]
