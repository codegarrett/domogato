"""Parse @mentions from comment bodies and create notifications."""
from __future__ import annotations

import re
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.services import notification_service

MENTION_PATTERN = re.compile(r'@([\w.+\-]+@[\w\-]+\.[\w.\-]+)', re.UNICODE)
MENTION_DISPLAY_PATTERN = re.compile(r'@([\w\s]+?)(?=[\s<,;.!?]|$)', re.UNICODE)


def extract_mentions(html_body: str) -> set[str]:
    """Extract email addresses from @email mentions in HTML body."""
    text = re.sub(r'<[^>]+>', ' ', html_body)
    emails = set()
    for match in MENTION_PATTERN.finditer(text):
        emails.add(match.group(1).lower())
    return emails


async def resolve_mentioned_users(
    db: AsyncSession,
    emails: set[str],
) -> list[User]:
    if not emails:
        return []
    result = await db.execute(
        select(User).where(User.email.in_(emails), User.is_active == True)  # noqa: E712
    )
    return list(result.scalars().all())


async def process_mentions(
    db: AsyncSession,
    *,
    html_body: str,
    ticket_id: UUID,
    ticket_title: str,
    author_id: UUID,
    author_name: str,
) -> list[UUID]:
    """Parse @mentions from body and create notifications. Returns list of notified user IDs."""
    emails = extract_mentions(html_body)
    if not emails:
        return []

    users = await resolve_mentioned_users(db, emails)
    notified: list[UUID] = []

    for user in users:
        if user.id == author_id:
            continue
        await notification_service.create_notification(
            db,
            user_id=user.id,
            event_type="mention",
            title=f"{author_name} mentioned you",
            body=f'You were mentioned in a comment on "{ticket_title}"',
            entity_type="ticket",
            entity_id=ticket_id,
            data={"author_id": str(author_id), "author_name": author_name},
        )
        notified.append(user.id)

    return notified
