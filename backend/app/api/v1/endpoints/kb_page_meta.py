from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.core.permissions import (
    ProjectRole,
    resolve_effective_project_role,
    PROJECT_ROLE_HIERARCHY,
)
from app.models.kb_page import KBPage
from app.models.kb_page_meta import KBPageMeta, KBPageTicketLink
from app.models.kb_space import KBSpace
from app.models.project import Project
from app.models.ticket import Ticket
from app.models.user import User
from app.schemas.kb_story import (
    PageMetaRead,
    PageMetaUpdate,
    PageTicketLinkCreate,
    PageTicketLinkRead,
    UserStoryForTicketRead,
)
from app.services import kb_story_service

router = APIRouter(tags=["knowledge-base"])


async def _resolve_project_from_page(db: AsyncSession, page_id: UUID) -> tuple[KBPage, Project]:
    result = await db.execute(select(KBPage).where(KBPage.id == page_id))
    page = result.scalar_one_or_none()
    if page is None or page.is_deleted:
        raise HTTPException(status_code=404, detail="Page not found")
    space_result = await db.execute(select(KBSpace).where(KBSpace.id == page.space_id))
    space = space_result.scalar_one_or_none()
    if space is None:
        raise HTTPException(status_code=404, detail="Space not found")
    proj_result = await db.execute(select(Project).where(Project.id == space.project_id))
    project = proj_result.scalar_one_or_none()
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return page, project


async def _require_kb_role(
    db: AsyncSession, user: User, project: Project, min_role: ProjectRole,
) -> None:
    if user.is_system_admin:
        return
    effective = await resolve_effective_project_role(
        user_id=user.id,
        project_id=project.id,
        organization_id=project.organization_id,
        project_visibility=project.visibility,
        is_system_admin=user.is_system_admin,
        db=db,
    )
    if effective is None or PROJECT_ROLE_HIERARCHY[effective] < PROJECT_ROLE_HIERARCHY[min_role]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")


def _build_meta_read(meta: KBPageMeta, link_count: int = 0) -> PageMetaRead:
    read = PageMetaRead.model_validate(meta)
    read.ticket_link_count = link_count
    return read


# ---------------------------------------------------------------------------
# Page Meta
# ---------------------------------------------------------------------------

@router.get("/kb/pages/{page_id}/meta", response_model=PageMetaRead | None)
async def get_page_meta(
    page_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    page, project = await _resolve_project_from_page(db, page_id)
    await _require_kb_role(db, user, project, ProjectRole.GUEST)
    meta = await kb_story_service.get_page_meta(db, page_id)
    if meta is None:
        return None
    link_count = len(meta.ticket_links) if meta.ticket_links else 0
    return _build_meta_read(meta, link_count)


@router.patch("/kb/pages/{page_id}/meta", response_model=PageMetaRead)
async def update_page_meta(
    page_id: UUID,
    body: PageMetaUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    page, project = await _resolve_project_from_page(db, page_id)
    await _require_kb_role(db, user, project, ProjectRole.DEVELOPER)
    meta = await kb_story_service.get_page_meta(db, page_id)
    if meta is None:
        raise HTTPException(status_code=404, detail="Page has no metadata")
    if body.story_workflow_status_id is not None:
        meta = await kb_story_service.upsert_page_meta(
            db, page_id, project.id, meta.page_type, body.story_workflow_status_id
        )
    link_count = len(meta.ticket_links) if meta.ticket_links else 0
    return _build_meta_read(meta, link_count)


# ---------------------------------------------------------------------------
# Ticket Links
# ---------------------------------------------------------------------------

@router.get("/kb/pages/{page_id}/ticket-links", response_model=list[PageTicketLinkRead])
async def list_ticket_links(
    page_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    page, project = await _resolve_project_from_page(db, page_id)
    await _require_kb_role(db, user, project, ProjectRole.GUEST)
    meta = await kb_story_service.get_page_meta(db, page_id)
    if meta is None:
        return []
    links = await kb_story_service.list_ticket_links(db, meta.id)
    return [PageTicketLinkRead(**l) for l in links]


@router.post(
    "/kb/pages/{page_id}/ticket-links",
    response_model=PageTicketLinkRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_ticket_link(
    page_id: UUID,
    body: PageTicketLinkCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    page, project = await _resolve_project_from_page(db, page_id)
    await _require_kb_role(db, user, project, ProjectRole.DEVELOPER)

    meta = await kb_story_service.get_page_meta(db, page_id)
    if meta is None:
        raise HTTPException(status_code=400, detail="Page has no metadata — cannot link tickets")

    ticket_result = await db.execute(
        select(Ticket).where(Ticket.id == body.ticket_id, Ticket.is_deleted == False)  # noqa: E712
    )
    ticket = ticket_result.scalar_one_or_none()
    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if ticket.project_id != project.id:
        raise HTTPException(status_code=400, detail="Ticket does not belong to this project")

    existing = await db.execute(
        select(KBPageTicketLink).where(
            KBPageTicketLink.page_meta_id == meta.id,
            KBPageTicketLink.ticket_id == body.ticket_id,
        )
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This ticket is already linked to this page",
        )

    await kb_story_service.add_ticket_link(db, meta.id, body.ticket_id, body.note, user.id)
    links = await kb_story_service.list_ticket_links(db, meta.id)
    for l in links:
        if l["ticket_id"] == body.ticket_id:
            return PageTicketLinkRead(**l)
    raise HTTPException(status_code=500, detail="Link created but could not be retrieved")


@router.delete(
    "/kb/pages/{page_id}/ticket-links/{link_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_ticket_link(
    page_id: UUID,
    link_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    page, project = await _resolve_project_from_page(db, page_id)
    await _require_kb_role(db, user, project, ProjectRole.DEVELOPER)

    result = await db.execute(
        select(KBPageTicketLink).where(KBPageTicketLink.id == link_id)
    )
    link = result.scalar_one_or_none()
    if link is None:
        raise HTTPException(status_code=404, detail="Link not found")

    await kb_story_service.remove_ticket_link(db, link)


# ---------------------------------------------------------------------------
# Reverse lookup: Ticket -> User Stories
# ---------------------------------------------------------------------------

@router.get(
    "/tickets/{ticket_id}/user-stories",
    response_model=list[UserStoryForTicketRead],
)
async def get_user_stories_for_ticket(
    ticket_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ticket_result = await db.execute(select(Ticket).where(Ticket.id == ticket_id))
    ticket = ticket_result.scalar_one_or_none()
    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")

    stories = await kb_story_service.get_user_stories_for_ticket(db, ticket_id)
    return [UserStoryForTicketRead(**s) for s in stories]
