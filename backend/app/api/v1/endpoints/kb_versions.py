from __future__ import annotations

import difflib
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.core.permissions import (
    PROJECT_ROLE_HIERARCHY,
    ProjectRole,
    resolve_effective_project_role,
)
from app.models.kb_page import KBPage
from app.models.kb_page_version import KBPageVersion
from app.models.project import Project
from app.models.user import User
from app.schemas.common import PaginatedResponse
from app.schemas.kb import (
    DiffEntry,
    DiffResponse,
    PageRead,
    VersionListItem,
    VersionRead,
)
from app.services import kb_service

router = APIRouter(tags=["knowledge-base"])


async def _require_page_role(
    db: AsyncSession, page: KBPage, user: User, min_role: ProjectRole,
) -> None:
    if user.is_system_admin:
        return
    space = await kb_service.get_space_by_id(db, page.space_id)
    if space is None:
        raise HTTPException(status_code=404, detail="Space not found")
    result = await db.execute(select(Project).where(Project.id == space.project_id))
    project = result.scalar_one_or_none()
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    effective = await resolve_effective_project_role(
        user_id=user.id,
        project_id=space.project_id,
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


async def _get_page_or_404(db: AsyncSession, page_id: UUID) -> KBPage:
    page = await kb_service.get_page(db, page_id)
    if page is None or page.is_deleted:
        raise HTTPException(status_code=404, detail="Page not found")
    return page


async def _get_version_or_404(
    db: AsyncSession, page_id: UUID, version_id: UUID,
) -> KBPageVersion:
    result = await db.execute(
        select(KBPageVersion).where(
            KBPageVersion.id == version_id,
            KBPageVersion.page_id == page_id,
        )
    )
    version = result.scalar_one_or_none()
    if version is None:
        raise HTTPException(status_code=404, detail="Version not found")
    return version


@router.get(
    "/kb/pages/{page_id}/versions",
    response_model=PaginatedResponse[VersionListItem],
)
async def list_versions(
    page_id: UUID,
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    page = await _get_page_or_404(db, page_id)
    await _require_page_role(db, page, user, ProjectRole.GUEST)

    total = (
        await db.execute(
            select(func.count())
            .select_from(KBPageVersion)
            .where(KBPageVersion.page_id == page_id)
        )
    ).scalar_one()

    result = await db.execute(
        select(KBPageVersion)
        .where(KBPageVersion.page_id == page_id)
        .order_by(KBPageVersion.version_number.desc())
        .offset(offset)
        .limit(limit)
    )
    versions = result.scalars().all()

    return PaginatedResponse(
        items=[VersionListItem.model_validate(v) for v in versions],
        total=total,
        offset=offset,
        limit=limit,
    )


@router.get(
    "/kb/pages/{page_id}/versions/{version_id}",
    response_model=VersionRead,
)
async def get_version(
    page_id: UUID,
    version_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    page = await _get_page_or_404(db, page_id)
    await _require_page_role(db, page, user, ProjectRole.GUEST)
    version = await _get_version_or_404(db, page_id, version_id)
    return VersionRead.model_validate(version)


@router.post(
    "/kb/pages/{page_id}/versions/{version_id}/restore",
    response_model=PageRead,
)
async def restore_version(
    page_id: UUID,
    version_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    page = await _get_page_or_404(db, page_id)
    await _require_page_role(db, page, user, ProjectRole.DEVELOPER)
    old_version = await _get_version_or_404(db, page_id, version_id)

    page.title = old_version.title
    page.content_markdown = old_version.content_markdown
    page.content_html = old_version.content_html
    page.last_edited_by = user.id
    await db.flush()
    await db.refresh(page)

    max_ver = (
        await db.execute(
            select(func.coalesce(func.max(KBPageVersion.version_number), 0))
            .where(KBPageVersion.page_id == page.id)
        )
    ).scalar_one()

    new_version = KBPageVersion(
        page_id=page.id,
        version_number=max_ver + 1,
        title=page.title,
        content_markdown=page.content_markdown,
        content_html=page.content_html,
        change_summary=f"Restored from version {old_version.version_number}",
        created_by=user.id,
    )
    db.add(new_version)
    await db.flush()

    from app.api.v1.endpoints.kb_pages import _enrich_page_read
    return await _enrich_page_read(db, page)


@router.get(
    "/kb/pages/{page_id}/versions/{v1_id}/diff/{v2_id}",
    response_model=DiffResponse,
)
async def diff_versions(
    page_id: UUID,
    v1_id: UUID,
    v2_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    page = await _get_page_or_404(db, page_id)
    await _require_page_role(db, page, user, ProjectRole.GUEST)

    old_version = await _get_version_or_404(db, page_id, v1_id)
    new_version = await _get_version_or_404(db, page_id, v2_id)

    old_lines = old_version.content_markdown.splitlines(keepends=True)
    new_lines = new_version.content_markdown.splitlines(keepends=True)
    diff_lines = difflib.unified_diff(old_lines, new_lines, lineterm="")

    entries: list[DiffEntry] = []
    added = removed = unchanged = 0
    for line in diff_lines:
        if line.startswith("@@") or line.startswith("---") or line.startswith("+++"):
            continue
        if line.startswith("+"):
            entries.append(DiffEntry(type="added", content=line[1:]))
            added += 1
        elif line.startswith("-"):
            entries.append(DiffEntry(type="removed", content=line[1:]))
            removed += 1
        else:
            entries.append(DiffEntry(type="unchanged", content=line[1:] if line.startswith(" ") else line))
            unchanged += 1

    return DiffResponse(
        from_version=VersionListItem.model_validate(old_version),
        to_version=VersionListItem.model_validate(new_version),
        diff=entries,
        stats={"added": added, "removed": removed, "unchanged": unchanged},
    )
