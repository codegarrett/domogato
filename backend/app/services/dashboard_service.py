from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from typing import Any
from uuid import UUID

from sqlalchemy import and_, case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.activity import ActivityLog
from app.models.membership import ProjectMembership
from app.models.project import Project
from app.models.sprint import Sprint
from app.models.ticket import Ticket
from app.models.ticket_watcher import TicketWatcher
from app.models.time_log import TimeLog
from app.models.workflow import WorkflowStatus


async def get_dashboard_data(
    db: AsyncSession,
    user_id: UUID,
) -> dict[str, Any]:
    now = datetime.now(timezone.utc)
    today = date.today()
    week_ago = now - timedelta(days=7)

    # Accessible project IDs
    member_projects = select(ProjectMembership.project_id).where(
        ProjectMembership.user_id == user_id
    )

    done_statuses = select(WorkflowStatus.id).where(
        WorkflowStatus.category == "done"
    )

    # -- Assigned open tickets --
    assigned_q = (
        select(
            Ticket.id,
            Ticket.title,
            Ticket.ticket_number,
            Ticket.priority,
            Ticket.due_date,
            Ticket.updated_at,
            Project.key.label("project_key"),
            Project.name.label("project_name"),
            WorkflowStatus.name.label("status_name"),
        )
        .join(Project, Project.id == Ticket.project_id)
        .join(WorkflowStatus, WorkflowStatus.id == Ticket.workflow_status_id)
        .where(
            Ticket.assignee_id == user_id,
            Ticket.is_deleted == False,  # noqa: E712
            Ticket.workflow_status_id.notin_(done_statuses),
        )
        .order_by(
            case(
                (Ticket.priority == "highest", 1),
                (Ticket.priority == "high", 2),
                (Ticket.priority == "medium", 3),
                (Ticket.priority == "low", 4),
                (Ticket.priority == "lowest", 5),
                else_=6,
            ),
            Ticket.updated_at.desc(),
        )
        .limit(25)
    )
    assigned_rows = (await db.execute(assigned_q)).all()
    assigned_tickets = [
        {
            "id": str(r.id),
            "title": r.title,
            "ticket_key": f"{r.project_key}-{r.ticket_number}",
            "priority": r.priority,
            "due_date": r.due_date.isoformat() if r.due_date else None,
            "status_name": r.status_name,
            "project_name": r.project_name,
        }
        for r in assigned_rows
    ]

    # -- Overdue count --
    overdue_q = select(func.count()).where(
        Ticket.assignee_id == user_id,
        Ticket.is_deleted == False,  # noqa: E712
        Ticket.workflow_status_id.notin_(done_statuses),
        Ticket.due_date < today,
        Ticket.due_date.isnot(None),
    )
    overdue_count = (await db.execute(overdue_q)).scalar_one()

    # -- Watched recently updated --
    watched_q = (
        select(
            Ticket.id,
            Ticket.title,
            Ticket.ticket_number,
            Ticket.updated_at,
            Project.key.label("project_key"),
        )
        .join(TicketWatcher, TicketWatcher.ticket_id == Ticket.id)
        .join(Project, Project.id == Ticket.project_id)
        .where(
            TicketWatcher.user_id == user_id,
            Ticket.is_deleted == False,  # noqa: E712
        )
        .order_by(Ticket.updated_at.desc())
        .limit(10)
    )
    watched_rows = (await db.execute(watched_q)).all()
    watched_recent = [
        {
            "id": str(r.id),
            "title": r.title,
            "ticket_key": f"{r.project_key}-{r.ticket_number}",
            "updated_at": r.updated_at.isoformat() if r.updated_at else None,
        }
        for r in watched_rows
    ]

    # -- Active sprints --
    sprint_q = (
        select(
            Sprint.id,
            Sprint.name,
            Sprint.end_date,
            Project.name.label("project_name"),
        )
        .join(Project, Project.id == Sprint.project_id)
        .where(
            Sprint.status == "active",
            Sprint.project_id.in_(member_projects),
        )
        .order_by(Sprint.end_date)
        .limit(5)
    )
    sprint_rows = (await db.execute(sprint_q)).all()

    active_sprints = []
    for sr in sprint_rows:
        total_q = select(func.count()).where(
            Ticket.sprint_id == sr.id, Ticket.is_deleted == False  # noqa: E712
        )
        done_q = select(func.count()).where(
            Ticket.sprint_id == sr.id,
            Ticket.is_deleted == False,  # noqa: E712
            Ticket.workflow_status_id.in_(done_statuses),
        )
        total = (await db.execute(total_q)).scalar_one()
        done = (await db.execute(done_q)).scalar_one()
        pct = round(done / total * 100) if total > 0 else 0
        active_sprints.append({
            "id": str(sr.id),
            "name": sr.name,
            "project_name": sr.project_name,
            "progress_pct": pct,
            "end_date": sr.end_date.isoformat() if sr.end_date else None,
        })

    # -- Recent activity --
    activity_q = (
        select(
            ActivityLog.id,
            ActivityLog.action,
            ActivityLog.field_name,
            ActivityLog.new_value,
            ActivityLog.created_at,
            Ticket.ticket_number,
            Project.key.label("project_key"),
        )
        .join(Ticket, Ticket.id == ActivityLog.ticket_id)
        .join(Project, Project.id == Ticket.project_id)
        .where(ActivityLog.user_id == user_id)
        .order_by(ActivityLog.created_at.desc())
        .limit(15)
    )
    activity_rows = (await db.execute(activity_q)).all()
    recent_activity = [
        {
            "id": str(r.id),
            "event_type": r.action,
            "title": f"{r.action} {r.project_key}-{r.ticket_number}"
                     + (f" ({r.field_name})" if r.field_name else ""),
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in activity_rows
    ]

    # -- Stats --
    open_q = select(func.count()).where(
        Ticket.assignee_id == user_id,
        Ticket.is_deleted == False,  # noqa: E712
        Ticket.workflow_status_id.notin_(done_statuses),
    )
    open_tickets = (await db.execute(open_q)).scalar_one()

    completed_q = select(func.count()).where(
        Ticket.assignee_id == user_id,
        Ticket.is_deleted == False,  # noqa: E712
        Ticket.resolved_at >= week_ago,
    )
    completed_this_week = (await db.execute(completed_q)).scalar_one()

    hours_q = select(func.coalesce(func.sum(TimeLog.seconds_spent), 0)).where(
        TimeLog.user_id == user_id,
        TimeLog.work_date >= (today - timedelta(days=7)),
    )
    hours_seconds = (await db.execute(hours_q)).scalar_one()

    return {
        "assigned_tickets": assigned_tickets,
        "overdue_count": overdue_count,
        "watched_recent": watched_recent,
        "active_sprints": active_sprints,
        "recent_activity": recent_activity,
        "stats": {
            "open_tickets": open_tickets,
            "completed_this_week": completed_this_week,
            "hours_logged_this_week": round(hours_seconds / 3600, 1),
        },
    }
