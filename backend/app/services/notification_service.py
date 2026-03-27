from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification
from app.websocket.manager import manager


async def create_notification(
    db: AsyncSession,
    *,
    user_id: UUID,
    event_type: str,
    title: str,
    body: str | None = None,
    entity_type: str | None = None,
    entity_id: UUID | None = None,
    data: dict[str, Any] | None = None,
) -> Notification:
    notif = Notification(
        user_id=user_id,
        event_type=event_type,
        title=title,
        body=body,
        entity_type=entity_type,
        entity_id=entity_id,
        data=data or {},
    )
    db.add(notif)
    await db.flush()
    await db.refresh(notif)

    await manager.send_to_user(str(user_id), {
        "type": "notification",
        "notification": {
            "id": str(notif.id),
            "event_type": event_type,
            "title": title,
            "body": body,
            "entity_type": entity_type,
            "entity_id": str(entity_id) if entity_id else None,
            "is_read": False,
            "created_at": notif.created_at.isoformat() if notif.created_at else None,
        },
    })

    return notif


async def list_notifications(
    db: AsyncSession,
    user_id: UUID,
    *,
    offset: int = 0,
    limit: int = 50,
    unread_only: bool = False,
) -> tuple[list[Notification], int]:
    base = select(Notification).where(Notification.user_id == user_id)
    if unread_only:
        base = base.where(Notification.is_read == False)  # noqa: E712

    count_q = select(func.count()).select_from(base.subquery())
    total = (await db.execute(count_q)).scalar_one()

    query = base.order_by(Notification.created_at.desc()).offset(offset).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all()), total


async def get_unread_count(db: AsyncSession, user_id: UUID) -> int:
    result = await db.execute(
        select(func.count())
        .where(Notification.user_id == user_id, Notification.is_read == False)  # noqa: E712
    )
    return result.scalar_one()


async def mark_as_read(db: AsyncSession, notification_id: UUID, user_id: UUID) -> bool:
    result = await db.execute(
        update(Notification)
        .where(Notification.id == notification_id, Notification.user_id == user_id)
        .values(is_read=True, read_at=datetime.now(timezone.utc))
    )
    await db.flush()
    return result.rowcount > 0


async def mark_all_read(db: AsyncSession, user_id: UUID) -> int:
    result = await db.execute(
        update(Notification)
        .where(Notification.user_id == user_id, Notification.is_read == False)  # noqa: E712
        .values(is_read=True, read_at=datetime.now(timezone.utc))
    )
    await db.flush()
    return result.rowcount
