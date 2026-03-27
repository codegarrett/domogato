from __future__ import annotations

import uuid

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.kb_page import KBPage
from app.models.kb_page_meta import KBPageMeta, KBPageTicketLink
from app.models.kb_space import KBSpace
from app.models.kb_story_workflow import KBStoryWorkflow, KBStoryWorkflowStatus
from app.models.project import Project
from app.models.ticket import Ticket
from app.models.user import User
from app.models.workflow import WorkflowStatus


_DEFAULT_STATUSES = [
    {"name": "Draft", "category": "draft", "color": "#6B7280", "position": 0, "is_initial": True, "is_terminal": False},
    {"name": "Pending Review", "category": "review", "color": "#F59E0B", "position": 1, "is_initial": False, "is_terminal": False},
    {"name": "Ready for Ticketing", "category": "ready", "color": "#3B82F6", "position": 2, "is_initial": False, "is_terminal": False},
    {"name": "Ticketed", "category": "ticketed", "color": "#10B981", "position": 3, "is_initial": False, "is_terminal": True},
]


# ---------------------------------------------------------------------------
# Story Workflow
# ---------------------------------------------------------------------------

async def get_or_create_story_workflow(
    db: AsyncSession,
    project_id: uuid.UUID,
) -> KBStoryWorkflow:
    result = await db.execute(
        select(KBStoryWorkflow)
        .options(selectinload(KBStoryWorkflow.statuses))
        .where(KBStoryWorkflow.project_id == project_id)
    )
    workflow = result.scalar_one_or_none()
    if workflow is not None:
        return workflow

    workflow = KBStoryWorkflow(project_id=project_id)
    db.add(workflow)
    await db.flush()

    for defaults in _DEFAULT_STATUSES:
        status = KBStoryWorkflowStatus(workflow_id=workflow.id, **defaults)
        db.add(status)
    await db.flush()

    await db.refresh(workflow)
    result = await db.execute(
        select(KBStoryWorkflow)
        .options(selectinload(KBStoryWorkflow.statuses))
        .where(KBStoryWorkflow.id == workflow.id)
    )
    return result.scalar_one()


async def get_initial_status(
    db: AsyncSession,
    project_id: uuid.UUID,
) -> KBStoryWorkflowStatus | None:
    workflow = await get_or_create_story_workflow(db, project_id)
    for s in workflow.statuses:
        if s.is_initial:
            return s
    return workflow.statuses[0] if workflow.statuses else None


async def add_workflow_status(
    db: AsyncSession,
    workflow_id: uuid.UUID,
    **kwargs: object,
) -> KBStoryWorkflowStatus:
    status = KBStoryWorkflowStatus(workflow_id=workflow_id, **kwargs)
    db.add(status)
    await db.flush()
    await db.refresh(status)
    return status


async def update_workflow_status(
    db: AsyncSession,
    status: KBStoryWorkflowStatus,
    update_data: dict,
) -> KBStoryWorkflowStatus:
    for key, value in update_data.items():
        setattr(status, key, value)
    await db.flush()
    await db.refresh(status)
    return status


async def is_status_in_use(db: AsyncSession, status_id: uuid.UUID) -> bool:
    count = (
        await db.execute(
            select(func.count())
            .select_from(KBPageMeta)
            .where(KBPageMeta.story_workflow_status_id == status_id)
        )
    ).scalar_one()
    return count > 0


async def delete_workflow_status(db: AsyncSession, status: KBStoryWorkflowStatus) -> None:
    await db.delete(status)
    await db.flush()


# ---------------------------------------------------------------------------
# Page Meta
# ---------------------------------------------------------------------------

async def get_page_meta(db: AsyncSession, page_id: uuid.UUID) -> KBPageMeta | None:
    result = await db.execute(
        select(KBPageMeta)
        .options(
            selectinload(KBPageMeta.story_status),
            selectinload(KBPageMeta.ticket_links),
        )
        .where(KBPageMeta.page_id == page_id)
    )
    return result.scalar_one_or_none()


async def upsert_page_meta(
    db: AsyncSession,
    page_id: uuid.UUID,
    project_id: uuid.UUID,
    page_type: str,
    status_id: uuid.UUID | None = None,
) -> KBPageMeta:
    meta = await get_page_meta(db, page_id)
    if meta is None:
        meta = KBPageMeta(
            page_id=page_id,
            page_type=page_type,
            story_workflow_status_id=status_id,
            project_id=project_id,
        )
        db.add(meta)
        await db.flush()
        await db.refresh(meta)
        result = await db.execute(
            select(KBPageMeta)
            .options(selectinload(KBPageMeta.story_status))
            .where(KBPageMeta.id == meta.id)
        )
        return result.scalar_one()
    if status_id is not None:
        meta.story_workflow_status_id = status_id
    await db.flush()
    await db.refresh(meta)
    result = await db.execute(
        select(KBPageMeta)
        .options(selectinload(KBPageMeta.story_status))
        .where(KBPageMeta.id == meta.id)
    )
    return result.scalar_one()


# ---------------------------------------------------------------------------
# Ticket Links
# ---------------------------------------------------------------------------

async def list_ticket_links(
    db: AsyncSession,
    page_meta_id: uuid.UUID,
) -> list[dict]:
    result = await db.execute(
        select(KBPageTicketLink)
        .where(KBPageTicketLink.page_meta_id == page_meta_id)
        .order_by(KBPageTicketLink.created_at)
    )
    links = result.scalars().all()

    enriched: list[dict] = []
    for link in links:
        ticket_result = await db.execute(
            select(Ticket).where(Ticket.id == link.ticket_id)
        )
        ticket = ticket_result.scalar_one_or_none()
        if ticket is None:
            continue

        project_result = await db.execute(select(Project).where(Project.id == ticket.project_id))
        project = project_result.scalar_one_or_none()
        ticket_key = f"{project.key}-{ticket.ticket_number}" if project else str(ticket.ticket_number)

        assignee_name: str | None = None
        if ticket.assignee_id:
            user_result = await db.execute(select(User).where(User.id == ticket.assignee_id))
            user = user_result.scalar_one_or_none()
            assignee_name = user.display_name if user else None

        status_name = ""
        status_color = ""
        if ticket.workflow_status_id:
            ws_result = await db.execute(
                select(WorkflowStatus).where(WorkflowStatus.id == ticket.workflow_status_id)
            )
            ws = ws_result.scalar_one_or_none()
            if ws:
                status_name = ws.name
                status_color = ws.color

        enriched.append({
            "id": link.id,
            "page_meta_id": link.page_meta_id,
            "ticket_id": link.ticket_id,
            "ticket_key": ticket_key,
            "ticket_title": ticket.title,
            "ticket_priority": ticket.priority or "",
            "ticket_status": status_name,
            "ticket_status_color": status_color,
            "ticket_assignee_name": assignee_name,
            "ticket_assignee_id": ticket.assignee_id,
            "note": link.note,
            "created_by": link.created_by,
            "created_at": link.created_at,
        })
    return enriched


async def add_ticket_link(
    db: AsyncSession,
    page_meta_id: uuid.UUID,
    ticket_id: uuid.UUID,
    note: str | None,
    user_id: uuid.UUID,
) -> KBPageTicketLink:
    link = KBPageTicketLink(
        page_meta_id=page_meta_id,
        ticket_id=ticket_id,
        note=note,
        created_by=user_id,
    )
    db.add(link)
    await db.flush()
    await db.refresh(link)
    return link


async def remove_ticket_link(db: AsyncSession, link: KBPageTicketLink) -> None:
    await db.delete(link)
    await db.flush()


# ---------------------------------------------------------------------------
# Reverse lookup: Ticket -> User Stories
# ---------------------------------------------------------------------------

async def get_user_stories_for_ticket(
    db: AsyncSession,
    ticket_id: uuid.UUID,
) -> list[dict]:
    result = await db.execute(
        select(KBPageTicketLink)
        .where(KBPageTicketLink.ticket_id == ticket_id)
    )
    links = result.scalars().all()

    stories: list[dict] = []
    for link in links:
        meta_result = await db.execute(
            select(KBPageMeta)
            .options(selectinload(KBPageMeta.story_status))
            .where(KBPageMeta.id == link.page_meta_id)
        )
        meta = meta_result.scalar_one_or_none()
        if meta is None or meta.page_type != "user_story":
            continue

        page_result = await db.execute(
            select(KBPage).where(KBPage.id == meta.page_id)
        )
        page = page_result.scalar_one_or_none()
        if page is None or page.is_deleted:
            continue

        space_result = await db.execute(
            select(KBSpace).where(KBSpace.id == page.space_id)
        )
        space = space_result.scalar_one_or_none()
        if space is None:
            continue

        stories.append({
            "page_id": page.id,
            "page_title": page.title,
            "page_slug": page.slug,
            "space_id": space.id,
            "space_name": space.name,
            "space_slug": space.slug,
            "story_status_name": meta.story_status.name if meta.story_status else None,
            "story_status_color": meta.story_status.color if meta.story_status else None,
            "story_status_category": meta.story_status.category if meta.story_status else None,
        })
    return stories
