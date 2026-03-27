from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.core.permissions import ProjectRole, require_project_role
from app.models.epic import Epic
from app.models.ticket import Ticket, TicketDependency
from app.models.user import User
from app.models.workflow import WorkflowStatus

router = APIRouter(tags=["timeline"])


@router.get("/projects/{project_id}/timeline")
async def get_timeline(
    project_id: UUID,
    user: User = Depends(get_current_user),
    _role: ProjectRole = require_project_role(ProjectRole.GUEST),
    db: AsyncSession = Depends(get_db),
):
    epics = (
        await db.execute(
            select(Epic)
            .where(Epic.project_id == project_id)
            .order_by(Epic.created_at)
        )
    ).scalars().all()

    tickets = (
        await db.execute(
            select(Ticket, WorkflowStatus.name, WorkflowStatus.category, WorkflowStatus.color)
            .join(WorkflowStatus, Ticket.workflow_status_id == WorkflowStatus.id)
            .where(Ticket.project_id == project_id, Ticket.is_deleted == False)  # noqa: E712
            .order_by(Ticket.start_date.nulls_last(), Ticket.created_at)
        )
    ).all()

    deps = (
        await db.execute(
            select(TicketDependency)
            .join(Ticket, TicketDependency.blocking_ticket_id == Ticket.id)
            .where(Ticket.project_id == project_id)
        )
    ).scalars().all()

    epic_list = []
    for e in epics:
        epic_list.append({
            "id": str(e.id),
            "type": "epic",
            "title": e.title,
            "start_date": str(e.start_date) if e.start_date else None,
            "due_date": str(e.target_date) if e.target_date else None,
            "status": e.status,
        })

    ticket_list = []
    unscheduled = []
    for t, status_name, status_category, status_color in tickets:
        item = {
            "id": str(t.id),
            "type": "ticket",
            "title": t.title,
            "ticket_number": t.ticket_number,
            "ticket_key": f"#{t.ticket_number}",
            "start_date": str(t.start_date) if t.start_date else None,
            "due_date": str(t.due_date) if t.due_date else None,
            "epic_id": str(t.epic_id) if t.epic_id else None,
            "status": status_name,
            "status_category": status_category,
            "status_color": status_color,
            "priority": t.priority,
            "story_points": t.story_points,
            "assignee_id": str(t.assignee_id) if t.assignee_id else None,
        }
        if t.start_date or t.due_date:
            ticket_list.append(item)
        else:
            unscheduled.append(item)

    dependency_list = [
        {
            "blocking_ticket_id": str(d.blocking_ticket_id),
            "blocked_ticket_id": str(d.blocked_ticket_id),
            "dependency_type": d.dependency_type,
        }
        for d in deps
    ]

    return {
        "epics": epic_list,
        "tickets": ticket_list,
        "unscheduled": unscheduled,
        "dependencies": dependency_list,
    }
