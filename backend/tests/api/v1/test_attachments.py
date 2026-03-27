"""Tests for file attachment endpoints."""
from __future__ import annotations

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import create_app

ORG_API = "/api/v1/organizations"
PROJECT_API = "/api/v1/projects"


async def _setup_ticket(admin_client: AsyncClient) -> tuple[str, str]:
    """Create org, project, and return (project_id, ticket_id)."""
    org_resp = await admin_client.post(
        ORG_API, json={"name": "Attach Org", "slug": "attach-org"},
    )
    assert org_resp.status_code == 201
    org = org_resp.json()

    wf_resp = await admin_client.get(f"{ORG_API}/{org['id']}/workflows")
    assert wf_resp.status_code == 200
    workflows = wf_resp.json()["items"]
    kanban = next(w for w in workflows if "Kanban" in w["name"])

    proj_resp = await admin_client.post(
        f"{ORG_API}/{org['id']}/projects",
        json={"name": "Attach Project", "key": "ATTCH", "visibility": "internal"},
    )
    assert proj_resp.status_code == 201
    project = proj_resp.json()

    if not project.get("default_workflow_id"):
        await admin_client.patch(
            f"{PROJECT_API}/{project['id']}",
            json={"default_workflow_id": kanban["id"]},
        )

    tkt_resp = await admin_client.post(
        f"{PROJECT_API}/{project['id']}/tickets",
        json={"title": "Ticket With Attachments"},
    )
    assert tkt_resp.status_code == 201

    return project["id"], tkt_resp.json()["id"]


@pytest.mark.asyncio
async def test_create_attachment(admin_client: AsyncClient):
    _, ticket_id = await _setup_ticket(admin_client)

    resp = await admin_client.post(
        f"/api/v1/tickets/{ticket_id}/attachments",
        json={
            "filename": "report.pdf",
            "content_type": "application/pdf",
            "size_bytes": 12345,
        },
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["attachment"]["filename"] == "report.pdf"
    assert data["attachment"]["content_type"] == "application/pdf"
    assert data["attachment"]["size_bytes"] == 12345
    assert "upload_url" in data


@pytest.mark.asyncio
async def test_create_attachment_invalid_content_type(admin_client: AsyncClient):
    _, ticket_id = await _setup_ticket(admin_client)

    resp = await admin_client.post(
        f"/api/v1/tickets/{ticket_id}/attachments",
        json={
            "filename": "malware.exe",
            "content_type": "application/x-executable",
            "size_bytes": 100,
        },
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_list_attachments(admin_client: AsyncClient):
    _, ticket_id = await _setup_ticket(admin_client)

    for i in range(3):
        resp = await admin_client.post(
            f"/api/v1/tickets/{ticket_id}/attachments",
            json={
                "filename": f"file{i}.txt",
                "content_type": "text/plain",
                "size_bytes": 100 + i,
            },
        )
        assert resp.status_code == 201

    resp = await admin_client.get(f"/api/v1/tickets/{ticket_id}/attachments")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 3
    assert len(data["items"]) == 3


@pytest.mark.asyncio
async def test_delete_attachment(admin_client: AsyncClient):
    _, ticket_id = await _setup_ticket(admin_client)

    create_resp = await admin_client.post(
        f"/api/v1/tickets/{ticket_id}/attachments",
        json={
            "filename": "to-delete.txt",
            "content_type": "text/plain",
            "size_bytes": 50,
        },
    )
    assert create_resp.status_code == 201
    att_id = create_resp.json()["attachment"]["id"]

    del_resp = await admin_client.delete(f"/api/v1/attachments/{att_id}")
    assert del_resp.status_code == 204

    list_resp = await admin_client.get(f"/api/v1/tickets/{ticket_id}/attachments")
    assert list_resp.json()["total"] == 0


@pytest.mark.asyncio
async def test_download_attachment(admin_client: AsyncClient):
    _, ticket_id = await _setup_ticket(admin_client)

    create_resp = await admin_client.post(
        f"/api/v1/tickets/{ticket_id}/attachments",
        json={
            "filename": "download-me.pdf",
            "content_type": "application/pdf",
            "size_bytes": 99999,
        },
    )
    assert create_resp.status_code == 201
    att_id = create_resp.json()["attachment"]["id"]

    dl_resp = await admin_client.get(f"/api/v1/attachments/{att_id}/download")
    assert dl_resp.status_code == 200
    assert "download_url" in dl_resp.json()
