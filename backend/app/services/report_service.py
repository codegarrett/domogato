from __future__ import annotations

from collections import defaultdict
from datetime import date, timedelta
from statistics import median
from typing import Any
from uuid import UUID

from sqlalchemy import and_, case, func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.activity import ActivityLog
from app.models.sprint import Sprint
from app.models.ticket import Ticket
from app.models.workflow import WorkflowStatus


async def get_project_summary(
    db: AsyncSession, project_id: UUID
) -> dict[str, Any]:
    today = date.today()

    status_q = (
        select(
            WorkflowStatus.category,
            func.count(Ticket.id).label("cnt"),
        )
        .join(WorkflowStatus, Ticket.workflow_status_id == WorkflowStatus.id)
        .where(Ticket.project_id == project_id, Ticket.is_deleted == False)  # noqa: E712
        .group_by(WorkflowStatus.category)
    )
    status_rows = (await db.execute(status_q)).all()
    cat_counts: dict[str, int] = {r[0]: r[1] for r in status_rows}

    todo = cat_counts.get("todo", 0)
    in_progress = cat_counts.get("in_progress", 0)
    done = cat_counts.get("done", 0)
    total = todo + in_progress + done

    overdue_q = (
        select(func.count())
        .select_from(Ticket)
        .join(WorkflowStatus, Ticket.workflow_status_id == WorkflowStatus.id)
        .where(
            Ticket.project_id == project_id,
            Ticket.is_deleted == False,  # noqa: E712
            Ticket.due_date < today,
            WorkflowStatus.category != "done",
        )
    )
    overdue = (await db.execute(overdue_q)).scalar_one()

    sp_q = (
        select(
            func.coalesce(func.sum(Ticket.story_points), 0),
            func.coalesce(
                func.sum(
                    case(
                        (WorkflowStatus.category == "done", Ticket.story_points),
                        else_=0,
                    )
                ),
                0,
            ),
        )
        .join(WorkflowStatus, Ticket.workflow_status_id == WorkflowStatus.id)
        .where(Ticket.project_id == project_id, Ticket.is_deleted == False)  # noqa: E712
    )
    sp_row = (await db.execute(sp_q)).one()
    total_sp = sp_row[0]
    completed_sp = sp_row[1]

    prio_q = (
        select(Ticket.priority, func.count())
        .where(Ticket.project_id == project_id, Ticket.is_deleted == False)  # noqa: E712
        .group_by(Ticket.priority)
    )
    by_priority = {r[0]: r[1] for r in (await db.execute(prio_q)).all()}

    type_q = (
        select(Ticket.ticket_type, func.count())
        .where(Ticket.project_id == project_id, Ticket.is_deleted == False)  # noqa: E712
        .group_by(Ticket.ticket_type)
    )
    by_type = {r[0]: r[1] for r in (await db.execute(type_q)).all()}

    return {
        "total_tickets": total,
        "open_tickets": todo,
        "in_progress_tickets": in_progress,
        "done_tickets": done,
        "overdue_tickets": overdue,
        "total_story_points": total_sp,
        "completed_story_points": completed_sp,
        "by_priority": by_priority,
        "by_type": by_type,
    }


async def get_velocity_report(
    db: AsyncSession, project_id: UUID
) -> dict[str, Any]:
    sprints = (
        await db.execute(
            select(Sprint)
            .where(Sprint.project_id == project_id, Sprint.status == "completed")
            .order_by(Sprint.completed_at)
        )
    ).scalars().all()

    entries = []
    for s in sprints:
        entries.append({
            "sprint_id": s.id,
            "sprint_name": s.name,
            "velocity": s.velocity or 0,
        })

    velocities = [e["velocity"] for e in entries if e["velocity"] > 0]
    avg = sum(velocities) / len(velocities) if velocities else 0

    return {"entries": entries, "average": round(avg, 1)}


async def get_sprint_report(
    db: AsyncSession, sprint_id: UUID
) -> dict[str, Any]:
    sprint = (
        await db.execute(select(Sprint).where(Sprint.id == sprint_id))
    ).scalar_one_or_none()
    if sprint is None:
        return {"sprint_id": sprint_id, "sprint_name": "", "tickets": [], "summary": {}}

    tickets = (await db.execute(
        select(Ticket)
        .where(Ticket.sprint_id == sprint_id, Ticket.is_deleted == False)  # noqa: E712
    )).scalars().all()

    total_tickets = len(tickets)
    total_sp = sum(t.story_points or 0 for t in tickets)

    status_ids = {t.workflow_status_id for t in tickets}
    terminal_set: set = set()
    if status_ids:
        terminal_rows = (await db.execute(
            select(WorkflowStatus.id).where(
                WorkflowStatus.id.in_(list(status_ids)),
                WorkflowStatus.is_terminal == True,  # noqa: E712
            )
        )).scalars().all()
        terminal_set = set(terminal_rows)

    completed = [t for t in tickets if t.workflow_status_id in terminal_set]
    incomplete = [t for t in tickets if t.workflow_status_id not in terminal_set]

    ticket_rows = []
    for t in tickets:
        ticket_rows.append({
            "ticket_id": t.id,
            "ticket_key": f"#{t.ticket_number}",
            "title": t.title,
            "story_points": t.story_points or 0,
            "completed": t.workflow_status_id in terminal_set,
            "priority": t.priority,
            "ticket_type": t.ticket_type,
        })

    return {
        "sprint_id": sprint_id,
        "sprint_name": sprint.name,
        "status": sprint.status,
        "start_date": sprint.start_date,
        "end_date": sprint.end_date,
        "summary": {
            "total_tickets": total_tickets,
            "completed_tickets": len(completed),
            "incomplete_tickets": len(incomplete),
            "total_story_points": total_sp,
            "completed_story_points": sum(t.story_points or 0 for t in completed),
            "incomplete_story_points": sum(t.story_points or 0 for t in incomplete),
            "completion_rate": round(len(completed) / total_tickets * 100, 1) if total_tickets else 0,
        },
        "tickets": ticket_rows,
    }


async def get_burndown_report(
    db: AsyncSession, sprint_id: UUID
) -> dict[str, Any]:
    sprint = (
        await db.execute(select(Sprint).where(Sprint.id == sprint_id))
    ).scalar_one_or_none()
    if sprint is None:
        return {"sprint_id": sprint_id, "points": []}

    start = sprint.start_date
    end = sprint.end_date or date.today()
    if start is None:
        return {"sprint_id": sprint_id, "points": []}

    total_sp = (
        await db.execute(
            select(func.coalesce(func.sum(Ticket.story_points), 0))
            .where(Ticket.sprint_id == sprint_id, Ticket.is_deleted == False)  # noqa: E712
        )
    ).scalar_one()

    done_sp = (
        await db.execute(
            select(func.coalesce(func.sum(Ticket.story_points), 0))
            .join(WorkflowStatus, Ticket.workflow_status_id == WorkflowStatus.id)
            .where(
                Ticket.sprint_id == sprint_id,
                Ticket.is_deleted == False,  # noqa: E712
                WorkflowStatus.category == "done",
            )
        )
    ).scalar_one()

    total_days = max((end - start).days, 1)
    points = []
    current = start
    day_idx = 0
    while current <= end:
        ideal = max(0, total_sp * (1 - day_idx / total_days))
        remaining = total_sp - done_sp if current >= date.today() else total_sp
        points.append({
            "date": current,
            "remaining": remaining,
            "ideal": round(ideal, 1),
        })
        current += timedelta(days=1)
        day_idx += 1

    return {"sprint_id": sprint_id, "points": points}


async def get_cumulative_flow(
    db: AsyncSession,
    project_id: UUID,
    start_date: date,
    end_date: date,
) -> dict[str, Any]:
    from app.models.daily_snapshot import DailySnapshot

    today = date.today()
    if end_date > today:
        end_date = today

    snapshots = (await db.execute(
        select(DailySnapshot)
        .where(
            DailySnapshot.project_id == project_id,
            DailySnapshot.snapshot_date >= start_date,
            DailySnapshot.snapshot_date <= end_date,
        )
        .order_by(DailySnapshot.snapshot_date)
    )).scalars().all()

    snap_map = {s.snapshot_date: s for s in snapshots}

    live_cats: dict[str, int] | None = None

    async def _get_live_counts() -> dict[str, int]:
        nonlocal live_cats
        if live_cats is not None:
            return live_cats
        base_q = (
            select(
                WorkflowStatus.category,
                func.count(Ticket.id),
            )
            .join(WorkflowStatus, Ticket.workflow_status_id == WorkflowStatus.id)
            .where(Ticket.project_id == project_id, Ticket.is_deleted == False)  # noqa: E712
            .group_by(WorkflowStatus.category)
        )
        rows = (await db.execute(base_q)).all()
        live_cats = {r[0]: r[1] for r in rows}
        return live_cats

    days = []
    current = start_date
    while current <= end_date:
        snap = snap_map.get(current)
        if snap is not None:
            by_status = snap.by_status or {}
            days.append({
                "date": current,
                "todo": by_status.get("to_do", 0),
                "in_progress": by_status.get("in_progress", 0),
                "done": by_status.get("done", 0),
            })
        else:
            cats = await _get_live_counts()
            days.append({
                "date": current,
                "todo": cats.get("to_do", 0),
                "in_progress": cats.get("in_progress", 0),
                "done": cats.get("done", 0),
            })
        current += timedelta(days=1)

    return {"project_id": project_id, "days": days}


async def get_cycle_time_report(
    db: AsyncSession,
    project_id: UUID,
    *,
    start_date: date | None = None,
    end_date: date | None = None,
) -> dict[str, Any]:
    q = (
        select(Ticket)
        .join(WorkflowStatus, Ticket.workflow_status_id == WorkflowStatus.id)
        .where(
            Ticket.project_id == project_id,
            Ticket.is_deleted == False,  # noqa: E712
            WorkflowStatus.category == "done",
            Ticket.resolved_at.isnot(None),
        )
    )
    if start_date:
        q = q.where(Ticket.created_at >= str(start_date))
    if end_date:
        q = q.where(Ticket.created_at <= str(end_date))

    tickets = (await db.execute(q)).scalars().all()

    entries = []
    times: list[float] = []
    for t in tickets:
        if t.resolved_at and t.created_at:
            delta = t.resolved_at - t.created_at
            hours = delta.total_seconds() / 3600
            times.append(hours)
            entries.append({
                "ticket_id": t.id,
                "ticket_key": f"#{t.ticket_number}",
                "title": t.title,
                "cycle_time_hours": round(hours, 1),
            })

    avg = round(sum(times) / len(times), 1) if times else 0
    med = round(median(times), 1) if times else 0

    return {
        "entries": entries,
        "average_hours": avg,
        "median_hours": med,
    }
