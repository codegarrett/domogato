"""Tests for ticket attachment embedding hooks."""
from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import AsyncClient


ORG_API = "/api/v1/organizations"
PROJECT_API = "/api/v1/projects"


async def _setup_ticket(admin_client: AsyncClient) -> tuple[str, str]:
    org_resp = await admin_client.post(
        ORG_API, json={"name": "Embed Org", "slug": "embed-org"},
    )
    org = org_resp.json()

    wf_resp = await admin_client.get(f"{ORG_API}/{org['id']}/workflows")
    kanban = next(w for w in wf_resp.json()["items"] if "Kanban" in w["name"])

    proj_resp = await admin_client.post(
        f"{ORG_API}/{org['id']}/projects",
        json={"name": "Embed Project", "key": "EMBD", "visibility": "internal"},
    )
    project = proj_resp.json()

    if not project.get("default_workflow_id"):
        await admin_client.patch(
            f"{PROJECT_API}/{project['id']}",
            json={"default_workflow_id": kanban["id"]},
        )

    tkt_resp = await admin_client.post(
        f"{PROJECT_API}/{project['id']}/tickets",
        json={"title": "Ticket With Embed"},
    )
    return project["id"], tkt_resp.json()["id"]


@pytest.mark.asyncio
async def test_create_embeddable_attachment_schedules_embedding(admin_client: AsyncClient):
    _, ticket_id = await _setup_ticket(admin_client)

    with patch(
        "app.api.v1.endpoints.attachments.is_embedding_configured",
        return_value=True,
    ), patch(
        "app.api.v1.endpoints.attachments.schedule_ticket_attachment_embedding"
    ) as mock_schedule, patch(
        "app.services.storage_service.put_object",
        new=AsyncMock(),
    ):
        resp = await admin_client.post(
            f"/api/v1/tickets/{ticket_id}/attachments",
            files={"file": ("report.txt", b"some text content", "text/plain")},
        )

    assert resp.status_code == 201
    mock_schedule.assert_called_once_with(resp.json()["id"])


@pytest.mark.asyncio
async def test_delete_attachment_schedules_embedding_delete(admin_client: AsyncClient):
    _, ticket_id = await _setup_ticket(admin_client)

    with patch("app.services.storage_service.put_object", new=AsyncMock()):
        create_resp = await admin_client.post(
            f"/api/v1/tickets/{ticket_id}/attachments",
            files={"file": ("report.txt", b"some text content", "text/plain")},
        )
    att_id = create_resp.json()["id"]

    with patch(
        "app.api.v1.endpoints.attachments.delete_kb_embeddings"
    ) as mock_delete, patch(
        "app.services.storage_service.delete_object",
        new=AsyncMock(),
    ):
        mock_delete.delay = MagicMock()
        del_resp = await admin_client.delete(f"/api/v1/attachments/{att_id}")

    assert del_resp.status_code == 204
    mock_delete.delay.assert_called_once_with("ticket_attachment", att_id)
