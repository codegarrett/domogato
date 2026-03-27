"""Celery tasks for email notification digests."""
from __future__ import annotations

import asyncio
from datetime import datetime, timezone

import structlog
from sqlalchemy import select, update, func
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.models.notification import Notification
from app.models.notification_preference import NotificationPreference
from app.models.user import User
from app.tasks.celery_app import celery_app

logger = structlog.get_logger()


def _get_async_session_factory():
    engine = create_async_engine(settings.DATABASE_URL, pool_size=2, max_overflow=0)
    return sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


def _run_async(coro):
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


async def _send_digests():
    from app.services.email_service import send_email, render_template

    if not settings.SMTP_ENABLED:
        return 0

    factory = _get_async_session_factory()
    sent_count = 0

    async with factory() as db:
        digest_user_ids = (
            await db.execute(
                select(NotificationPreference.user_id)
                .where(
                    NotificationPreference.email == True,  # noqa: E712
                    NotificationPreference.email_delivery == "digest",
                )
                .distinct()
            )
        ).scalars().all()

        if not digest_user_ids:
            return 0

        for user_id in digest_user_ids:
            notifs_q = (
                select(Notification)
                .where(
                    Notification.user_id == user_id,
                    Notification.emailed_at.is_(None),
                    Notification.is_read == False,  # noqa: E712
                )
                .order_by(Notification.created_at.desc())
                .limit(50)
            )
            notifs = list((await db.execute(notifs_q)).scalars().all())
            if not notifs:
                continue

            user = (await db.execute(
                select(User).where(User.id == user_id)
            )).scalar_one_or_none()
            if not user or not user.email:
                continue

            notif_data = []
            for n in notifs:
                created_display = ""
                if n.created_at:
                    created_display = n.created_at.strftime("%b %d, %H:%M")
                notif_data.append({
                    "event_type": n.event_type,
                    "title": n.title,
                    "body": n.body or "",
                    "created_at_display": created_display,
                })

            html_body = render_template("digest.html", {"notifications": notif_data})
            subject = f"[{settings.APP_NAME}] {len(notifs)} new notification{'s' if len(notifs) != 1 else ''}"

            ok = await send_email(
                to_email=user.email,
                subject=subject,
                html_body=html_body,
            )

            if ok:
                notif_ids = [n.id for n in notifs]
                await db.execute(
                    update(Notification)
                    .where(Notification.id.in_(notif_ids))
                    .values(emailed_at=datetime.now(timezone.utc))
                )
                await db.commit()
                sent_count += 1
            else:
                await db.rollback()

    return sent_count


@celery_app.task(name="send_notification_digests")
def send_notification_digests():
    count = _run_async(_send_digests())
    return {"digests_sent": count}
