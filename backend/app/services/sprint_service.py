from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from sqlalchemy import and_, func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.sprint import Sprint
from app.models.ticket import Ticket
from app.models.workflow import WorkflowStatus


async def create_sprint(
    db: AsyncSession,
    *,
    project_id: UUID,
    name: str,
    goal: str | None = None,
    start_date: Any = None,
    end_date: Any = None,
) -> Sprint:
    sprint = Sprint(
        project_id=project_id,
        name=name,
        goal=goal,
        start_date=start_date,
        end_date=end_date,
        status="planning",
    )
    db.add(sprint)
    await db.flush()
    await db.refresh(sprint)
    return sprint


async def get_sprint(db: AsyncSession, sprint_id: UUID) -> Sprint | None:
    result = await db.execute(select(Sprint).where(Sprint.id == sprint_id))
    return result.scalar_one_or_none()


async def list_sprints(
    db: AsyncSession,
    project_id: UUID,
    *,
    offset: int = 0,
    limit: int = 50,
    status_filter: str | None = None,
) -> tuple[list[Sprint], int]:
    base = select(Sprint).where(Sprint.project_id == project_id)
    if status_filter:
        base = base.where(Sprint.status == status_filter)

    count_q = select(func.count()).select_from(base.subquery())
    total = (await db.execute(count_q)).scalar_one()

    query = (
        base.order_by(
            Sprint.status.desc(),
            Sprint.start_date.asc().nullslast(),
            Sprint.created_at.desc(),
        )
        .offset(offset)
        .limit(limit)
    )
    result = await db.execute(query)
    return list(result.scalars().all()), total


async def update_sprint(
    db: AsyncSession, sprint_id: UUID, **kwargs: Any
) -> Sprint | None:
    sprint = await get_sprint(db, sprint_id)
    if sprint is None:
        return None
    for key, value in kwargs.items():
        if hasattr(sprint, key):
            setattr(sprint, key, value)
    await db.flush()
    await db.refresh(sprint)
    return sprint


async def delete_sprint(db: AsyncSession, sprint_id: UUID) -> bool:
    sprint = await get_sprint(db, sprint_id)
    if sprint is None:
        return False
    await db.execute(
        update(Ticket)
        .where(Ticket.sprint_id == sprint_id)
        .values(sprint_id=None)
    )
    await db.delete(sprint)
    await db.flush()
    return True


async def start_sprint(db: AsyncSession, sprint_id: UUID) -> Sprint:
    sprint = await get_sprint(db, sprint_id)
    if sprint is None:
        raise ValueError("Sprint not found")
    if sprint.status != "planning":
        raise ValueError("Only planning sprints can be started")

    existing_active = (
        await db.execute(
            select(Sprint).where(
                Sprint.project_id == sprint.project_id,
                Sprint.status == "active",
            )
        )
    ).scalar_one_or_none()
    if existing_active:
        raise ValueError("Another sprint is already active for this project")

    sprint.status = "active"
    if not sprint.start_date:
        sprint.start_date = datetime.now(timezone.utc).date()
    await db.flush()
    await db.refresh(sprint)
    return sprint


async def complete_sprint(
    db: AsyncSession,
    sprint_id: UUID,
    move_incomplete_to: str = "backlog",
) -> Sprint:
    sprint = await get_sprint(db, sprint_id)
    if sprint is None:
        raise ValueError("Sprint not found")
    if sprint.status != "active":
        raise ValueError("Only active sprints can be completed")

    terminal_status_ids = (
        await db.execute(
            select(WorkflowStatus.id).where(WorkflowStatus.is_terminal == True)  # noqa: E712
        )
    ).scalars().all()
    terminal_set = set(terminal_status_ids)

    sprint_tickets = (
        await db.execute(
            select(Ticket).where(
                Ticket.sprint_id == sprint_id,
                Ticket.is_deleted == False,  # noqa: E712
            )
        )
    ).scalars().all()

    completed_points = 0
    incomplete_ticket_ids = []
    for t in sprint_tickets:
        if t.workflow_status_id in terminal_set:
            completed_points += t.story_points or 0
        else:
            incomplete_ticket_ids.append(t.id)

    if move_incomplete_to == "backlog":
        if incomplete_ticket_ids:
            await db.execute(
                update(Ticket)
                .where(Ticket.id.in_(incomplete_ticket_ids))
                .values(sprint_id=None)
            )
    else:
        target_sprint_id = UUID(move_incomplete_to)
        target = await get_sprint(db, target_sprint_id)
        if target is None or target.status == "completed":
            raise ValueError("Target sprint not found or already completed")
        if incomplete_ticket_ids:
            await db.execute(
                update(Ticket)
                .where(Ticket.id.in_(incomplete_ticket_ids))
                .values(sprint_id=target_sprint_id)
            )

    sprint.status = "completed"
    sprint.completed_at = datetime.now(timezone.utc)
    sprint.velocity = completed_points
    await db.flush()
    await db.refresh(sprint)
    return sprint


async def get_sprint_stats(
    db: AsyncSession, sprint_id: UUID
) -> dict[str, int]:
    terminal_status_ids = set(
        (
            await db.execute(
                select(WorkflowStatus.id).where(WorkflowStatus.is_terminal == True)  # noqa: E712
            )
        ).scalars().all()
    )

    tickets = (
        await db.execute(
            select(Ticket).where(
                Ticket.sprint_id == sprint_id,
                Ticket.is_deleted == False,  # noqa: E712
            )
        )
    ).scalars().all()

    total_tickets = len(tickets)
    completed_tickets = sum(1 for t in tickets if t.workflow_status_id in terminal_status_ids)
    total_sp = sum(t.story_points or 0 for t in tickets)
    completed_sp = sum(
        t.story_points or 0 for t in tickets if t.workflow_status_id in terminal_status_ids
    )
    return {
        "total_tickets": total_tickets,
        "completed_tickets": completed_tickets,
        "total_story_points": total_sp,
        "completed_story_points": completed_sp,
    }


# ---------- Backlog ----------


async def get_backlog(
    db: AsyncSession,
    project_id: UUID,
    *,
    offset: int = 0,
    limit: int = 50,
) -> tuple[list[Ticket], int]:
    base = (
        select(Ticket)
        .where(
            Ticket.project_id == project_id,
            Ticket.sprint_id.is_(None),
            Ticket.is_deleted == False,  # noqa: E712
        )
    )
    count_q = select(func.count()).select_from(base.subquery())
    total = (await db.execute(count_q)).scalar_one()

    query = base.order_by(Ticket.backlog_rank.asc()).offset(offset).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all()), total


_RANK_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"


def _midpoint(a: str, b: str) -> str:
    """Compute a lexicographic midpoint between two rank strings."""
    max_len = max(len(a), len(b)) + 1
    a_padded = a.ljust(max_len, _RANK_CHARS[0])
    b_padded = b.ljust(max_len, _RANK_CHARS[0])

    result: list[str] = []
    carry = 0
    for i in range(max_len - 1, -1, -1):
        ai = _RANK_CHARS.index(a_padded[i]) if a_padded[i] in _RANK_CHARS else 0
        bi = _RANK_CHARS.index(b_padded[i]) if b_padded[i] in _RANK_CHARS else 0
        s = ai + bi + carry
        carry = s // len(_RANK_CHARS)
        result.append(_RANK_CHARS[s % len(_RANK_CHARS)])
    if carry:
        result.append(_RANK_CHARS[carry])

    mid_str = "".join(reversed(result))
    half: list[str] = []
    remainder = 0
    for ch in mid_str:
        val = _RANK_CHARS.index(ch) + remainder * len(_RANK_CHARS)
        half.append(_RANK_CHARS[val // 2])
        remainder = val % 2
    return "".join(half).rstrip(_RANK_CHARS[0]) or _RANK_CHARS[0]


async def reorder_backlog(
    db: AsyncSession, project_id: UUID, ticket_ids: list[UUID]
) -> None:
    step = "m"
    ranks: list[str] = []
    prev = _RANK_CHARS[0]
    for _ in ticket_ids:
        nxt = _midpoint(prev, "z" * 3)
        ranks.append(nxt)
        prev = nxt

    for tid, rank in zip(ticket_ids, ranks):
        await db.execute(
            update(Ticket)
            .where(Ticket.id == tid, Ticket.project_id == project_id)
            .values(backlog_rank=rank)
        )
    await db.flush()


async def move_tickets_to_sprint(
    db: AsyncSession,
    project_id: UUID,
    ticket_ids: list[UUID],
    sprint_id: UUID,
) -> int:
    sprint = await get_sprint(db, sprint_id)
    if sprint is None:
        raise ValueError("Sprint not found")
    if sprint.project_id != project_id:
        raise ValueError("Sprint does not belong to this project")
    if sprint.status == "completed":
        raise ValueError("Cannot add tickets to a completed sprint")

    result = await db.execute(
        update(Ticket)
        .where(
            Ticket.id.in_(ticket_ids),
            Ticket.project_id == project_id,
            Ticket.is_deleted == False,  # noqa: E712
        )
        .values(sprint_id=sprint_id)
    )
    await db.flush()
    return result.rowcount


async def remove_tickets_from_sprint(
    db: AsyncSession,
    ticket_ids: list[UUID],
) -> int:
    result = await db.execute(
        update(Ticket)
        .where(Ticket.id.in_(ticket_ids))
        .values(sprint_id=None)
    )
    await db.flush()
    return result.rowcount
