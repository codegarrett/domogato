from __future__ import annotations

from typing import Any
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.epic import Epic
from app.models.ticket import Ticket


async def create_epic(
    db: AsyncSession,
    *,
    project_id: UUID,
    title: str,
    description: str | None = None,
    status: str = "open",
    color: str = "#3B82F6",
    start_date: Any | None = None,
    target_date: Any | None = None,
    created_by_id: UUID | None = None,
) -> Epic:
    max_order = (
        await db.execute(
            select(func.max(Epic.sort_order))
            .where(Epic.project_id == project_id)
        )
    ).scalar_one_or_none()
    next_order = chr(ord(max_order[0]) + 1) if max_order else "a"

    epic = Epic(
        project_id=project_id,
        title=title,
        description=description,
        status=status,
        color=color,
        start_date=start_date,
        target_date=target_date,
        sort_order=next_order,
        created_by_id=created_by_id,
    )
    db.add(epic)
    await db.flush()
    await db.refresh(epic)
    return epic


async def get_epic(db: AsyncSession, epic_id: UUID) -> Epic | None:
    result = await db.execute(
        select(Epic).where(Epic.id == epic_id)
    )
    return result.scalar_one_or_none()


async def list_epics(
    db: AsyncSession,
    project_id: UUID,
    *,
    offset: int = 0,
    limit: int = 50,
) -> tuple[list[Epic], int]:
    base = select(Epic).where(Epic.project_id == project_id)

    count_query = select(func.count()).select_from(base.subquery())
    total = (await db.execute(count_query)).scalar_one()

    query = base.order_by(Epic.sort_order).offset(offset).limit(limit)
    result = await db.execute(query)
    epics = list(result.scalars().all())

    return epics, total


async def update_epic(
    db: AsyncSession, epic_id: UUID, **kwargs: Any
) -> Epic | None:
    epic = await get_epic(db, epic_id)
    if epic is None:
        return None

    for key, value in kwargs.items():
        if value is not None and hasattr(epic, key):
            setattr(epic, key, value)
    await db.flush()
    await db.refresh(epic)
    return epic


async def delete_epic(db: AsyncSession, epic_id: UUID) -> bool:
    epic = await get_epic(db, epic_id)
    if epic is None:
        return False
    await db.delete(epic)
    await db.flush()
    return True


async def get_epic_progress(db: AsyncSession, epic_id: UUID) -> dict[str, Any]:
    from app.models.workflow import WorkflowStatus

    total_q = select(func.count()).where(
        Ticket.epic_id == epic_id,
        Ticket.is_deleted == False,  # noqa: E712
    )
    total = (await db.execute(total_q)).scalar_one()

    category_q = (
        select(WorkflowStatus.category, func.count())
        .join(Ticket, Ticket.workflow_status_id == WorkflowStatus.id)
        .where(
            Ticket.epic_id == epic_id,
            Ticket.is_deleted == False,  # noqa: E712
        )
        .group_by(WorkflowStatus.category)
    )
    rows = (await db.execute(category_q)).all()

    by_category: dict[str, int] = {}
    for category, count in rows:
        by_category[category] = count

    return {
        "total": total,
        "by_category": by_category,
        "done": by_category.get("done", 0),
        "percentage": round(by_category.get("done", 0) / total * 100) if total else 0,
    }
