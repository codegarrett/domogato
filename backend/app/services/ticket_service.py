from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from sqlalchemy import func, select, text, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.project import Project
from app.models.ticket import Ticket
from app.models.workflow import Workflow, WorkflowStatus, WorkflowTransition


async def _get_initial_status(db: AsyncSession, project_id: UUID) -> WorkflowStatus:
    project = (
        await db.execute(select(Project).where(Project.id == project_id))
    ).scalar_one_or_none()
    if project is None:
        raise ValueError("Project not found")
    if project.default_workflow_id is None:
        raise ValueError("Project has no default workflow configured")

    status = (
        await db.execute(
            select(WorkflowStatus).where(
                WorkflowStatus.workflow_id == project.default_workflow_id,
                WorkflowStatus.is_initial == True,  # noqa: E712
            )
        )
    ).scalar_one_or_none()
    if status is None:
        raise ValueError("Default workflow has no initial status")
    return status


async def create_ticket(
    db: AsyncSession,
    *,
    project_id: UUID,
    title: str,
    description: str | None = None,
    ticket_type: str = "task",
    priority: str = "medium",
    assignee_id: UUID | None = None,
    reporter_id: UUID | None = None,
    epic_id: UUID | None = None,
    story_points: int | None = None,
    due_date: Any | None = None,
    start_date: Any | None = None,
    parent_ticket_id: UUID | None = None,
) -> Ticket:
    initial_status = await _get_initial_status(db, project_id)

    result = await db.execute(
        text(
            "UPDATE projects SET ticket_sequence = ticket_sequence + 1 "
            "WHERE id = :project_id RETURNING ticket_sequence"
        ),
        {"project_id": project_id},
    )
    ticket_number = result.scalar_one()

    ticket = Ticket(
        project_id=project_id,
        ticket_number=ticket_number,
        title=title,
        description=description,
        ticket_type=ticket_type,
        priority=priority,
        workflow_status_id=initial_status.id,
        assignee_id=assignee_id,
        reporter_id=reporter_id,
        epic_id=epic_id,
        story_points=story_points,
        due_date=due_date,
        start_date=start_date,
        parent_ticket_id=parent_ticket_id,
    )
    db.add(ticket)
    await db.flush()
    await db.refresh(ticket)
    return ticket


async def get_ticket(db: AsyncSession, ticket_id: UUID) -> Ticket | None:
    result = await db.execute(
        select(Ticket).where(Ticket.id == ticket_id)
    )
    return result.scalar_one_or_none()


async def list_tickets(
    db: AsyncSession,
    project_id: UUID,
    *,
    offset: int = 0,
    limit: int = 50,
    search: str | None = None,
    ticket_type: str | None = None,
    priority: str | None = None,
    assignee_id: UUID | None = None,
    epic_id: UUID | None = None,
    sprint_id: UUID | None = None,
    workflow_status_id: UUID | None = None,
    is_deleted: bool = False,
    sort_by: str = "created_at",
    sort_dir: str = "desc",
) -> tuple[list[Ticket], int]:
    query = select(Ticket).where(
        Ticket.project_id == project_id,
        Ticket.is_deleted == is_deleted,
    )

    if search:
        term = search.strip()
        try:
            num = int(term.split("-")[-1]) if "-" in term else int(term)
            query = query.where(Ticket.ticket_number == num)
        except (ValueError, IndexError):
            pattern = f"%{term}%"
            query = query.where(Ticket.title.ilike(pattern))
    if ticket_type is not None:
        query = query.where(Ticket.ticket_type == ticket_type)
    if priority is not None:
        query = query.where(Ticket.priority == priority)
    if assignee_id is not None:
        query = query.where(Ticket.assignee_id == assignee_id)
    if epic_id is not None:
        query = query.where(Ticket.epic_id == epic_id)
    if sprint_id is not None:
        query = query.where(Ticket.sprint_id == sprint_id)
    if workflow_status_id is not None:
        query = query.where(Ticket.workflow_status_id == workflow_status_id)

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar_one()

    sort_column = getattr(Ticket, sort_by, Ticket.created_at)
    order = sort_column.desc() if sort_dir == "desc" else sort_column.asc()
    query = query.order_by(order).offset(offset).limit(limit)
    result = await db.execute(query)
    tickets = list(result.scalars().all())

    return tickets, total


async def update_ticket(
    db: AsyncSession, ticket_id: UUID, **kwargs: Any
) -> Ticket | None:
    ticket = await get_ticket(db, ticket_id)
    if ticket is None:
        return None

    for key, value in kwargs.items():
        if value is not None and hasattr(ticket, key):
            setattr(ticket, key, value)
    await db.flush()
    await db.refresh(ticket)
    return ticket


async def transition_status(
    db: AsyncSession,
    ticket_id: UUID,
    new_status_id: UUID,
    resolution: str | None = None,
) -> Ticket:
    ticket = await get_ticket(db, ticket_id)
    if ticket is None:
        raise ValueError("Ticket not found")

    transition = (
        await db.execute(
            select(WorkflowTransition).where(
                WorkflowTransition.from_status_id == ticket.workflow_status_id,
                WorkflowTransition.to_status_id == new_status_id,
            )
        )
    ).scalar_one_or_none()
    if transition is None:
        raise ValueError(
            "No valid workflow transition from current status to the requested status"
        )

    new_status = (
        await db.execute(
            select(WorkflowStatus).where(WorkflowStatus.id == new_status_id)
        )
    ).scalar_one_or_none()

    ticket.workflow_status_id = new_status_id
    if resolution is not None:
        ticket.resolution = resolution
    if new_status and new_status.is_terminal:
        ticket.resolved_at = datetime.now(timezone.utc)
    elif new_status and not new_status.is_terminal:
        ticket.resolved_at = None
        ticket.resolution = None

    await db.flush()
    await db.refresh(ticket)
    return ticket


async def soft_delete_ticket(db: AsyncSession, ticket_id: UUID) -> Ticket | None:
    ticket = await get_ticket(db, ticket_id)
    if ticket is None:
        return None
    ticket.is_deleted = True
    await db.flush()
    await db.refresh(ticket)
    return ticket


async def bulk_update(
    db: AsyncSession,
    ticket_ids: list[UUID],
    **kwargs: Any,
) -> list[Ticket]:
    values: dict[str, Any] = {}
    for key, value in kwargs.items():
        if value is not None:
            values[key] = value

    if values:
        await db.execute(
            update(Ticket)
            .where(Ticket.id.in_(ticket_ids))
            .values(**values)
        )
        await db.flush()

    result = await db.execute(
        select(Ticket).where(Ticket.id.in_(ticket_ids))
    )
    return list(result.scalars().all())


async def get_ticket_tree(
    db: AsyncSession, ticket_id: UUID
) -> dict[str, Any]:
    ticket = await get_ticket(db, ticket_id)
    if ticket is None:
        raise ValueError("Ticket not found")

    children_result = await db.execute(
        select(Ticket).where(
            Ticket.parent_ticket_id == ticket_id,
            Ticket.is_deleted == False,  # noqa: E712
        )
    )
    children = list(children_result.scalars().all())

    ancestors: list[Ticket] = []
    current = ticket
    while current.parent_ticket_id is not None:
        parent = await get_ticket(db, current.parent_ticket_id)
        if parent is None:
            break
        ancestors.append(parent)
        current = parent

    return {
        "ticket": ticket,
        "children": children,
        "ancestors": list(reversed(ancestors)),
    }


async def bulk_update_tickets(
    db: AsyncSession,
    ticket_ids: list[UUID],
    **fields: Any,
) -> int:
    """Bulk update fields on multiple tickets. Returns count of updated rows."""
    clean = {k: v for k, v in fields.items() if v is not None}
    if not clean or not ticket_ids:
        return 0
    result = await db.execute(
        update(Ticket)
        .where(Ticket.id.in_(ticket_ids), Ticket.is_deleted == False)  # noqa: E712
        .values(**clean)
    )
    await db.flush()
    return result.rowcount


async def export_tickets_csv(
    db: AsyncSession,
    project_id: UUID,
) -> list[dict[str, Any]]:
    """Export all active tickets for a project as a list of dicts (for CSV generation)."""
    result = await db.execute(
        select(Ticket)
        .where(Ticket.project_id == project_id, Ticket.is_deleted == False)  # noqa: E712
        .order_by(Ticket.ticket_number.asc())
    )
    tickets = result.scalars().all()
    rows = []
    for t in tickets:
        rows.append({
            "ticket_number": t.ticket_number,
            "title": t.title,
            "type": t.ticket_type,
            "priority": t.priority,
            "status_id": str(t.workflow_status_id),
            "assignee_id": str(t.assignee_id) if t.assignee_id else "",
            "reporter_id": str(t.reporter_id) if t.reporter_id else "",
            "story_points": t.story_points or "",
            "start_date": str(t.start_date) if t.start_date else "",
            "due_date": str(t.due_date) if t.due_date else "",
            "resolution": t.resolution or "",
            "created_at": t.created_at.isoformat() if t.created_at else "",
            "updated_at": t.updated_at.isoformat() if t.updated_at else "",
        })
    return rows


async def search_tickets(
    db: AsyncSession,
    project_id: UUID,
    query: str,
    *,
    offset: int = 0,
    limit: int = 50,
) -> tuple[list[Ticket], int]:
    term = query.strip()
    base = select(Ticket).where(
        Ticket.project_id == project_id,
        Ticket.is_deleted == False,  # noqa: E712
    )
    try:
        num = int(term.split("-")[-1]) if "-" in term else int(term)
        base = base.where(Ticket.ticket_number == num)
    except (ValueError, IndexError):
        base = base.where(Ticket.title.ilike(f"%{term}%"))

    count_query = select(func.count()).select_from(base.subquery())
    total = (await db.execute(count_query)).scalar_one()

    result = await db.execute(
        base.order_by(Ticket.created_at.desc()).offset(offset).limit(limit)
    )
    tickets = list(result.scalars().all())
    return tickets, total
