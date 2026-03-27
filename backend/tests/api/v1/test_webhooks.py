from __future__ import annotations

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Organization, Project
from app.models.user import User


pytestmark = pytest.mark.asyncio


class TestWebhookCRUD:
    async def test_create_webhook(
        self, admin_client: AsyncClient, test_project: Project,
    ):
        resp = await admin_client.post(
            f"/api/v1/projects/{test_project.id}/webhooks",
            json={
                "name": "CI Webhook",
                "url": "https://example.com/hooks/ci",
                "secret": "s3cret",
                "events": ["ticket.created", "ticket.updated"],
            },
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "CI Webhook"
        assert data["url"] == "https://example.com/hooks/ci"
        assert data["is_active"] is True
        assert len(data["events"]) == 2

    async def test_list_webhooks(
        self, admin_client: AsyncClient, test_project: Project,
    ):
        await admin_client.post(
            f"/api/v1/projects/{test_project.id}/webhooks",
            json={"name": "WH1", "url": "https://a.com/hook"},
        )
        await admin_client.post(
            f"/api/v1/projects/{test_project.id}/webhooks",
            json={"name": "WH2", "url": "https://b.com/hook"},
        )

        resp = await admin_client.get(f"/api/v1/projects/{test_project.id}/webhooks")
        assert resp.status_code == 200
        assert len(resp.json()) == 2

    async def test_update_webhook(
        self, admin_client: AsyncClient, test_project: Project,
    ):
        create_resp = await admin_client.post(
            f"/api/v1/projects/{test_project.id}/webhooks",
            json={"name": "WH", "url": "https://a.com/hook"},
        )
        wh_id = create_resp.json()["id"]

        resp = await admin_client.patch(
            f"/api/v1/webhooks/{wh_id}",
            json={"name": "Updated WH", "is_active": False},
        )
        assert resp.status_code == 200
        assert resp.json()["name"] == "Updated WH"
        assert resp.json()["is_active"] is False

    async def test_delete_webhook(
        self, admin_client: AsyncClient, test_project: Project,
    ):
        create_resp = await admin_client.post(
            f"/api/v1/projects/{test_project.id}/webhooks",
            json={"name": "WH", "url": "https://a.com/hook"},
        )
        wh_id = create_resp.json()["id"]

        resp = await admin_client.delete(f"/api/v1/webhooks/{wh_id}")
        assert resp.status_code == 204

        resp = await admin_client.get(f"/api/v1/webhooks/{wh_id}")
        assert resp.status_code == 404

    async def test_list_deliveries_empty(
        self, admin_client: AsyncClient, test_project: Project,
    ):
        create_resp = await admin_client.post(
            f"/api/v1/projects/{test_project.id}/webhooks",
            json={"name": "WH", "url": "https://a.com/hook"},
        )
        wh_id = create_resp.json()["id"]

        resp = await admin_client.get(f"/api/v1/webhooks/{wh_id}/deliveries")
        assert resp.status_code == 200
        assert resp.json()["total"] == 0
