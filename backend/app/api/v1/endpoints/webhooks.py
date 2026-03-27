from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.core.permissions import ProjectRole, require_project_role
from app.models.user import User
from app.schemas.webhook import (
    WebhookCreate,
    WebhookDeliveryRead,
    WebhookRead,
    WebhookTestRequest,
    WebhookUpdate,
)
from app.services import webhook_service

router = APIRouter(tags=["webhooks"])


@router.get(
    "/projects/{project_id}/webhooks",
    response_model=list[WebhookRead],
)
async def list_webhooks(
    project_id: UUID,
    user: User = Depends(get_current_user),
    _role: ProjectRole = require_project_role(ProjectRole.MAINTAINER),
    db: AsyncSession = Depends(get_db),
):
    webhooks = await webhook_service.list_webhooks(db, project_id)
    return [WebhookRead.model_validate(w) for w in webhooks]


@router.post(
    "/projects/{project_id}/webhooks",
    response_model=WebhookRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_webhook(
    project_id: UUID,
    body: WebhookCreate,
    user: User = Depends(get_current_user),
    _role: ProjectRole = require_project_role(ProjectRole.MAINTAINER),
    db: AsyncSession = Depends(get_db),
):
    wh = await webhook_service.create_webhook(
        db,
        project_id=project_id,
        name=body.name,
        url=body.url,
        secret=body.secret,
        events=body.events,
    )
    return WebhookRead.model_validate(wh)


@router.get(
    "/webhooks/{webhook_id}",
    response_model=WebhookRead,
)
async def get_webhook(
    webhook_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    wh = await webhook_service.get_webhook(db, webhook_id)
    if wh is None:
        raise HTTPException(status_code=404, detail="Webhook not found")
    return WebhookRead.model_validate(wh)


@router.patch(
    "/webhooks/{webhook_id}",
    response_model=WebhookRead,
)
async def update_webhook(
    webhook_id: UUID,
    body: WebhookUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    wh = await webhook_service.get_webhook(db, webhook_id)
    if wh is None:
        raise HTTPException(status_code=404, detail="Webhook not found")
    update_data = body.model_dump(exclude_unset=True)
    updated = await webhook_service.update_webhook(db, webhook_id, **update_data)
    return WebhookRead.model_validate(updated)


@router.delete(
    "/webhooks/{webhook_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_webhook(
    webhook_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    wh = await webhook_service.get_webhook(db, webhook_id)
    if wh is None:
        raise HTTPException(status_code=404, detail="Webhook not found")
    await webhook_service.delete_webhook(db, webhook_id)


@router.get(
    "/webhooks/{webhook_id}/deliveries",
    response_model=dict,
)
async def list_deliveries(
    webhook_id: UUID,
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    wh = await webhook_service.get_webhook(db, webhook_id)
    if wh is None:
        raise HTTPException(status_code=404, detail="Webhook not found")
    deliveries, total = await webhook_service.list_deliveries(
        db, webhook_id, offset=offset, limit=limit,
    )
    return {
        "items": [WebhookDeliveryRead.model_validate(d) for d in deliveries],
        "total": total,
        "offset": offset,
        "limit": limit,
    }


@router.post(
    "/webhooks/{webhook_id}/test",
    status_code=status.HTTP_200_OK,
)
async def test_webhook(
    webhook_id: UUID,
    body: WebhookTestRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    wh = await webhook_service.get_webhook(db, webhook_id)
    if wh is None:
        raise HTTPException(status_code=404, detail="Webhook not found")

    from app.tasks.webhook_tasks import deliver_webhook
    deliver_webhook.delay(
        webhook_id=str(wh.id),
        url=wh.url,
        secret=wh.secret,
        event_type="test",
        payload={"event": "test", "webhook_id": str(wh.id), "message": "Test delivery"},
    )
    return {"status": "queued"}
