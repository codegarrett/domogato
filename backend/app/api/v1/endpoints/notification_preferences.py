from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.notification_preference import NotificationPreference
from app.models.user import User
from app.schemas.notification_preference import NotificationPrefRead, NotificationPrefUpdate

router = APIRouter(prefix="/users/me/notification-preferences", tags=["notifications"])

DEFAULT_CATEGORIES = [
    "ticket_assigned",
    "ticket_commented",
    "ticket_status_changed",
    "mentioned",
    "sprint_started",
    "sprint_completed",
    "kb_page_updated",
]


async def _ensure_defaults(db: AsyncSession, user_id):
    """Create default preference rows if they don't exist yet."""
    values = [
        {"user_id": user_id, "event_category": cat} for cat in DEFAULT_CATEGORIES
    ]
    stmt = (
        pg_insert(NotificationPreference)
        .values(values)
        .on_conflict_do_nothing(constraint="uq_notif_pref_user_event")
    )
    await db.execute(stmt)
    await db.flush()


@router.get("", response_model=list[NotificationPrefRead])
async def get_preferences(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _ensure_defaults(db, user.id)
    result = await db.execute(
        select(NotificationPreference)
        .where(NotificationPreference.user_id == user.id)
        .order_by(NotificationPreference.event_category)
    )
    return list(result.scalars().all())


@router.put("", response_model=list[NotificationPrefRead])
async def update_preferences(
    body: list[NotificationPrefUpdate],
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _ensure_defaults(db, user.id)
    for item in body:
        if item.event_category not in DEFAULT_CATEGORIES:
            continue
        stmt = (
            pg_insert(NotificationPreference)
            .values(
                user_id=user.id,
                event_category=item.event_category,
                in_app=item.in_app,
                email=item.email,
                email_delivery=item.email_delivery,
            )
            .on_conflict_do_update(
                constraint="uq_notif_pref_user_event",
                set_={
                    "in_app": item.in_app,
                    "email": item.email,
                    "email_delivery": item.email_delivery,
                },
            )
        )
        await db.execute(stmt)
    await db.flush()

    result = await db.execute(
        select(NotificationPreference)
        .where(NotificationPreference.user_id == user.id)
        .order_by(NotificationPreference.event_category)
    )
    return list(result.scalars().all())
