from __future__ import annotations

import hashlib
import hmac
import json
import time
from typing import Any
from uuid import UUID

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.webhook import Webhook, WebhookDelivery

MAX_CONSECUTIVE_FAILURES = 10


async def create_webhook(
    db: AsyncSession,
    *,
    project_id: UUID,
    name: str,
    url: str,
    secret: str | None = None,
    events: list[str] | None = None,
) -> Webhook:
    wh = Webhook(
        project_id=project_id,
        name=name,
        url=url,
        secret=secret,
        events=events or [],
    )
    db.add(wh)
    await db.flush()
    await db.refresh(wh)
    return wh


async def get_webhook(db: AsyncSession, webhook_id: UUID) -> Webhook | None:
    result = await db.execute(
        select(Webhook).where(Webhook.id == webhook_id)
    )
    return result.scalar_one_or_none()


async def list_webhooks(
    db: AsyncSession, project_id: UUID
) -> list[Webhook]:
    result = await db.execute(
        select(Webhook)
        .where(Webhook.project_id == project_id)
        .order_by(Webhook.created_at)
    )
    return list(result.scalars().all())


async def update_webhook(
    db: AsyncSession, webhook_id: UUID, **kwargs: Any
) -> Webhook | None:
    wh = await get_webhook(db, webhook_id)
    if wh is None:
        return None
    for k, v in kwargs.items():
        if v is not None and hasattr(wh, k):
            setattr(wh, k, v)
    await db.flush()
    await db.refresh(wh)
    return wh


async def delete_webhook(db: AsyncSession, webhook_id: UUID) -> bool:
    wh = await get_webhook(db, webhook_id)
    if wh is None:
        return False
    await db.delete(wh)
    await db.flush()
    return True


async def list_deliveries(
    db: AsyncSession,
    webhook_id: UUID,
    *,
    offset: int = 0,
    limit: int = 50,
) -> tuple[list[WebhookDelivery], int]:
    base = select(WebhookDelivery).where(WebhookDelivery.webhook_id == webhook_id)
    count_q = select(func.count()).select_from(base.subquery())
    total = (await db.execute(count_q)).scalar_one()
    query = base.order_by(WebhookDelivery.created_at.desc()).offset(offset).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all()), total


async def get_matching_webhooks(
    db: AsyncSession, project_id: UUID, event_type: str
) -> list[Webhook]:
    """Get all active webhooks that match the given event type."""
    webhooks = await list_webhooks(db, project_id)
    return [
        wh for wh in webhooks
        if wh.is_active and (not wh.events or event_type in wh.events)
    ]


def sign_payload(payload: str, secret: str) -> str:
    return hmac.new(
        secret.encode(), payload.encode(), hashlib.sha256
    ).hexdigest()


async def record_delivery(
    db: AsyncSession,
    *,
    webhook_id: UUID,
    event_type: str,
    payload: dict,
    response_status: int | None = None,
    response_body: str | None = None,
    duration_ms: int | None = None,
    success: bool = False,
    attempt: int = 1,
    error_message: str | None = None,
) -> WebhookDelivery:
    delivery = WebhookDelivery(
        webhook_id=webhook_id,
        event_type=event_type,
        payload=payload,
        response_status=response_status,
        response_body=response_body[:2000] if response_body else None,
        duration_ms=duration_ms,
        success=success,
        attempt=attempt,
        error_message=error_message,
    )
    db.add(delivery)

    wh = await get_webhook(db, webhook_id)
    if wh:
        if success:
            wh.consecutive_failures = 0
        else:
            wh.consecutive_failures += 1
            if wh.consecutive_failures >= MAX_CONSECUTIVE_FAILURES:
                wh.is_active = False

    await db.flush()
    await db.refresh(delivery)
    return delivery
