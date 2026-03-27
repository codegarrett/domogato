from __future__ import annotations

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.services import notification_service


pytestmark = pytest.mark.asyncio


class TestNotificationCRUD:
    async def test_list_notifications_empty(
        self, admin_client: AsyncClient,
    ):
        resp = await admin_client.get("/api/v1/notifications")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 0
        assert data["items"] == []

    async def test_unread_count_empty(
        self, admin_client: AsyncClient,
    ):
        resp = await admin_client.get("/api/v1/notifications/unread-count")
        assert resp.status_code == 200
        assert resp.json()["unread_count"] == 0

    async def test_create_and_list(
        self, admin_client: AsyncClient, db: AsyncSession, admin_user: User,
    ):
        await notification_service.create_notification(
            db,
            user_id=admin_user.id,
            event_type="ticket.created",
            title="New ticket PROJ-1",
            body="A new ticket was created",
            entity_type="ticket",
        )

        resp = await admin_client.get("/api/v1/notifications")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 1
        assert data["items"][0]["title"] == "New ticket PROJ-1"
        assert data["items"][0]["is_read"] is False

    async def test_unread_count(
        self, admin_client: AsyncClient, db: AsyncSession, admin_user: User,
    ):
        await notification_service.create_notification(
            db,
            user_id=admin_user.id,
            event_type="ticket.updated",
            title="Ticket updated",
        )
        await notification_service.create_notification(
            db,
            user_id=admin_user.id,
            event_type="comment.added",
            title="New comment",
        )

        resp = await admin_client.get("/api/v1/notifications/unread-count")
        assert resp.json()["unread_count"] == 2

    async def test_mark_as_read(
        self, admin_client: AsyncClient, db: AsyncSession, admin_user: User,
    ):
        notif = await notification_service.create_notification(
            db,
            user_id=admin_user.id,
            event_type="test",
            title="Test notification",
        )

        resp = await admin_client.post(f"/api/v1/notifications/{notif.id}/read")
        assert resp.status_code == 204

        resp = await admin_client.get("/api/v1/notifications/unread-count")
        assert resp.json()["unread_count"] == 0

    async def test_mark_all_read(
        self, admin_client: AsyncClient, db: AsyncSession, admin_user: User,
    ):
        for i in range(3):
            await notification_service.create_notification(
                db,
                user_id=admin_user.id,
                event_type="test",
                title=f"Notification {i}",
            )

        resp = await admin_client.get("/api/v1/notifications/unread-count")
        assert resp.json()["unread_count"] == 3

        resp = await admin_client.post("/api/v1/notifications/read-all")
        assert resp.status_code == 200
        assert resp.json()["marked_read"] == 3

        resp = await admin_client.get("/api/v1/notifications/unread-count")
        assert resp.json()["unread_count"] == 0

    async def test_unread_only_filter(
        self, admin_client: AsyncClient, db: AsyncSession, admin_user: User,
    ):
        n1 = await notification_service.create_notification(
            db, user_id=admin_user.id, event_type="test", title="Read",
        )
        await notification_service.create_notification(
            db, user_id=admin_user.id, event_type="test", title="Unread",
        )
        await notification_service.mark_as_read(db, n1.id, admin_user.id)

        resp = await admin_client.get("/api/v1/notifications", params={"unread_only": True})
        assert resp.json()["total"] == 1
        assert resp.json()["items"][0]["title"] == "Unread"
