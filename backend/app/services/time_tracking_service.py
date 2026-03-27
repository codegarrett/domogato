from __future__ import annotations

from collections import defaultdict
from datetime import date, timedelta
from typing import Any
from uuid import UUID

from sqlalchemy import and_, delete, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ticket import Ticket
from app.models.time_log import TimeLog


async def log_time(
    db: AsyncSession,
    *,
    ticket_id: UUID,
    project_id: UUID,
    user_id: UUID,
    seconds_spent: int,
    work_date: date,
    description: str | None = None,
    activity_type: str = "general",
) -> TimeLog:
    entry = TimeLog(
        ticket_id=ticket_id,
        project_id=project_id,
        user_id=user_id,
        seconds_spent=seconds_spent,
        work_date=work_date,
        description=description,
        activity_type=activity_type,
    )
    db.add(entry)
    await db.flush()

    await _recalc_remaining(db, ticket_id)

    await db.refresh(entry)
    return entry


async def get_time_log(db: AsyncSession, log_id: UUID) -> TimeLog | None:
    result = await db.execute(select(TimeLog).where(TimeLog.id == log_id))
    return result.scalar_one_or_none()


async def update_time_log(
    db: AsyncSession, log_id: UUID, **kwargs: Any
) -> TimeLog | None:
    entry = await get_time_log(db, log_id)
    if entry is None:
        return None
    for k, v in kwargs.items():
        if v is not None and hasattr(entry, k):
            setattr(entry, k, v)
    await db.flush()

    await _recalc_remaining(db, entry.ticket_id)

    await db.refresh(entry)
    return entry


async def delete_time_log(db: AsyncSession, log_id: UUID) -> bool:
    entry = await get_time_log(db, log_id)
    if entry is None:
        return False
    ticket_id = entry.ticket_id
    await db.delete(entry)
    await db.flush()

    await _recalc_remaining(db, ticket_id)
    return True


async def list_time_logs_for_ticket(
    db: AsyncSession,
    ticket_id: UUID,
    *,
    offset: int = 0,
    limit: int = 50,
) -> tuple[list[TimeLog], int]:
    base = select(TimeLog).where(TimeLog.ticket_id == ticket_id)
    count_q = select(func.count()).select_from(base.subquery())
    total = (await db.execute(count_q)).scalar_one()

    query = base.order_by(TimeLog.work_date.desc(), TimeLog.created_at.desc()).offset(offset).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all()), total


async def get_ticket_time_summary(
    db: AsyncSession, ticket_id: UUID
) -> dict[str, int]:
    total = (
        await db.execute(
            select(func.coalesce(func.sum(TimeLog.seconds_spent), 0))
            .where(TimeLog.ticket_id == ticket_id)
        )
    ).scalar_one()

    ticket = (
        await db.execute(
            select(
                Ticket.original_estimate_seconds,
                Ticket.remaining_estimate_seconds,
            ).where(Ticket.id == ticket_id)
        )
    ).one_or_none()

    return {
        "total_logged_seconds": total,
        "original_estimate_seconds": ticket.original_estimate_seconds if ticket else None,
        "remaining_estimate_seconds": ticket.remaining_estimate_seconds if ticket else None,
    }


async def get_time_report_by_project(
    db: AsyncSession,
    project_id: UUID,
    *,
    start_date: date | None = None,
    end_date: date | None = None,
    user_id: UUID | None = None,
) -> tuple[list[TimeLog], int]:
    base = select(TimeLog).where(TimeLog.project_id == project_id)
    if start_date:
        base = base.where(TimeLog.work_date >= start_date)
    if end_date:
        base = base.where(TimeLog.work_date <= end_date)
    if user_id:
        base = base.where(TimeLog.user_id == user_id)

    count_q = select(func.count()).select_from(base.subquery())
    total_seconds_q = select(
        func.coalesce(func.sum(TimeLog.seconds_spent), 0)
    ).select_from(base.subquery())

    total_count = (await db.execute(count_q)).scalar_one()

    query = base.order_by(TimeLog.work_date.desc(), TimeLog.created_at.desc())
    result = await db.execute(query)
    return list(result.scalars().all()), total_count


async def get_timesheet(
    db: AsyncSession,
    user_id: UUID,
    start_date: date,
    end_date: date,
) -> dict:
    entries = (
        await db.execute(
            select(TimeLog)
            .where(
                TimeLog.user_id == user_id,
                TimeLog.work_date >= start_date,
                TimeLog.work_date <= end_date,
            )
            .order_by(TimeLog.work_date, TimeLog.created_at)
        )
    ).scalars().all()

    by_date: dict[date, list[TimeLog]] = defaultdict(list)
    for e in entries:
        by_date[e.work_date].append(e)

    days = []
    current = start_date
    total = 0
    while current <= end_date:
        day_entries = by_date.get(current, [])
        day_total = sum(e.seconds_spent for e in day_entries)
        total += day_total
        days.append({
            "date": current,
            "total_seconds": day_total,
            "entries": day_entries,
        })
        current += timedelta(days=1)

    return {
        "user_id": user_id,
        "start_date": start_date,
        "end_date": end_date,
        "total_seconds": total,
        "days": days,
    }


async def _recalc_remaining(db: AsyncSession, ticket_id: UUID) -> None:
    """Recalculate remaining estimate = original - total logged."""
    ticket = (
        await db.execute(select(Ticket).where(Ticket.id == ticket_id))
    ).scalar_one_or_none()
    if ticket is None or ticket.original_estimate_seconds is None:
        return

    total_logged = (
        await db.execute(
            select(func.coalesce(func.sum(TimeLog.seconds_spent), 0))
            .where(TimeLog.ticket_id == ticket_id)
        )
    ).scalar_one()

    ticket.remaining_estimate_seconds = max(0, ticket.original_estimate_seconds - total_logged)
    await db.flush()
