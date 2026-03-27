from __future__ import annotations

from typing import Any
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.activity import ActivityLog
from app.models.user import User


async def log_activity(
    db: AsyncSession,
    *,
    ticket_id: UUID,
    user_id: UUID | None = None,
    action: str,
    field_name: str | None = None,
    old_value: str | None = None,
    new_value: str | None = None,
    metadata_json: dict[str, Any] | None = None,
) -> ActivityLog:
    entry = ActivityLog(
        ticket_id=ticket_id,
        user_id=user_id,
        action=action,
        field_name=field_name,
        old_value=old_value,
        new_value=new_value,
        metadata_json=metadata_json or {},
    )
    db.add(entry)
    await db.flush()
    await db.refresh(entry)
    return entry


async def log_ticket_changes(
    db: AsyncSession,
    *,
    ticket_id: UUID,
    user_id: UUID,
    old_data: dict[str, Any],
    new_data: dict[str, Any],
) -> list[ActivityLog]:
    entries: list[ActivityLog] = []

    for field, new_val in new_data.items():
        old_val = old_data.get(field)
        if old_val == new_val:
            continue

        entry = await log_activity(
            db,
            ticket_id=ticket_id,
            user_id=user_id,
            action="field_change",
            field_name=field,
            old_value=str(old_val) if old_val is not None else None,
            new_value=str(new_val) if new_val is not None else None,
        )
        entries.append(entry)

    return entries


async def list_activity(
    db: AsyncSession,
    ticket_id: UUID,
    *,
    offset: int = 0,
    limit: int = 50,
) -> tuple[list[dict[str, Any]], int]:
    base = select(ActivityLog).where(ActivityLog.ticket_id == ticket_id)

    count_query = select(func.count()).select_from(base.subquery())
    total = (await db.execute(count_query)).scalar_one()

    query = (
        select(ActivityLog, User)
        .outerjoin(User, User.id == ActivityLog.user_id)
        .where(ActivityLog.ticket_id == ticket_id)
        .order_by(ActivityLog.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    result = await db.execute(query)
    rows = result.all()

    entries = []
    for entry, user in rows:
        entries.append({
            "id": entry.id,
            "ticket_id": entry.ticket_id,
            "user_id": entry.user_id,
            "user_name": user.display_name if user else None,
            "action": entry.action,
            "field_name": entry.field_name,
            "old_value": entry.old_value,
            "new_value": entry.new_value,
            "metadata_json": entry.metadata_json,
            "created_at": entry.created_at,
        })

    return entries, total


async def list_project_activity(
    db: AsyncSession,
    project_id: UUID,
    *,
    offset: int = 0,
    limit: int = 50,
    action_filter: str | None = None,
    user_id_filter: UUID | None = None,
) -> tuple[list[dict[str, Any]], int]:
    from app.models.ticket import Ticket

    base = (
        select(ActivityLog)
        .join(Ticket, Ticket.id == ActivityLog.ticket_id)
        .where(Ticket.project_id == project_id)
    )
    if action_filter:
        base = base.where(ActivityLog.action == action_filter)
    if user_id_filter:
        base = base.where(ActivityLog.user_id == user_id_filter)

    count_query = select(func.count()).select_from(base.subquery())
    total = (await db.execute(count_query)).scalar_one()

    query = (
        select(ActivityLog, User)
        .join(Ticket, Ticket.id == ActivityLog.ticket_id)
        .outerjoin(User, User.id == ActivityLog.user_id)
        .where(Ticket.project_id == project_id)
    )
    if action_filter:
        query = query.where(ActivityLog.action == action_filter)
    if user_id_filter:
        query = query.where(ActivityLog.user_id == user_id_filter)

    query = query.order_by(ActivityLog.created_at.desc()).offset(offset).limit(limit)
    result = await db.execute(query)
    rows = result.all()

    entries = []
    for entry, user in rows:
        entries.append({
            "id": entry.id,
            "ticket_id": entry.ticket_id,
            "user_id": entry.user_id,
            "user_name": user.display_name if user else None,
            "action": entry.action,
            "field_name": entry.field_name,
            "old_value": entry.old_value,
            "new_value": entry.new_value,
            "metadata_json": entry.metadata_json,
            "created_at": entry.created_at,
        })

    return entries, total
