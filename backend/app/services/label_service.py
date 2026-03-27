from __future__ import annotations

from typing import Any
from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.label import Label, ticket_labels
from app.models.ticket import Ticket


async def create_label(
    db: AsyncSession,
    *,
    project_id: UUID,
    name: str,
    color: str = "#6B7280",
    description: str | None = None,
) -> Label:
    label = Label(
        project_id=project_id,
        name=name,
        color=color,
        description=description,
    )
    db.add(label)
    await db.flush()
    await db.refresh(label)
    return label


async def get_label(db: AsyncSession, label_id: UUID) -> Label | None:
    result = await db.execute(
        select(Label).where(Label.id == label_id)
    )
    return result.scalar_one_or_none()


async def list_labels(
    db: AsyncSession,
    project_id: UUID,
) -> list[Label]:
    result = await db.execute(
        select(Label)
        .where(Label.project_id == project_id)
        .order_by(Label.name)
    )
    return list(result.scalars().all())


async def update_label(
    db: AsyncSession, label_id: UUID, **kwargs: Any
) -> Label | None:
    label = await get_label(db, label_id)
    if label is None:
        return None

    for key, value in kwargs.items():
        if value is not None and hasattr(label, key):
            setattr(label, key, value)
    await db.flush()
    await db.refresh(label)
    return label


async def delete_label(db: AsyncSession, label_id: UUID) -> bool:
    label = await get_label(db, label_id)
    if label is None:
        return False
    await db.delete(label)
    await db.flush()
    return True


async def add_label_to_ticket(
    db: AsyncSession,
    ticket_id: UUID,
    label_id: UUID,
) -> None:
    existing = await db.execute(
        select(ticket_labels).where(
            ticket_labels.c.ticket_id == ticket_id,
            ticket_labels.c.label_id == label_id,
        )
    )
    if existing.first() is not None:
        return

    await db.execute(
        ticket_labels.insert().values(ticket_id=ticket_id, label_id=label_id)
    )
    await db.flush()


async def remove_label_from_ticket(
    db: AsyncSession,
    ticket_id: UUID,
    label_id: UUID,
) -> bool:
    result = await db.execute(
        delete(ticket_labels).where(
            ticket_labels.c.ticket_id == ticket_id,
            ticket_labels.c.label_id == label_id,
        )
    )
    await db.flush()
    return result.rowcount > 0


async def get_labels_for_ticket(
    db: AsyncSession,
    ticket_id: UUID,
) -> list[Label]:
    result = await db.execute(
        select(Label)
        .join(ticket_labels, ticket_labels.c.label_id == Label.id)
        .where(ticket_labels.c.ticket_id == ticket_id)
        .order_by(Label.name)
    )
    return list(result.scalars().all())
