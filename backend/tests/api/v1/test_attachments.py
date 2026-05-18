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
        files={"file": ("report.pdf", b"%PDF-1.4 test", "application/pdf")},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["filename"] == "report.pdf"
    assert data["content_type"] == "application/pdf"
    assert data["size_bytes"] == len(b"%PDF-1.4 test")


@pytest.mark.asyncio
async def test_create_attachment_invalid_content_type(admin_client: AsyncClient):
    _, ticket_id = await _setup_ticket(admin_client)

    resp = await admin_client.post(
        f"/api/v1/tickets/{ticket_id}/attachments",
        files={"file": ("malware.exe", b"MZ", "application/x-executable")},
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_list_attachments(admin_client: AsyncClient):
    _, ticket_id = await _setup_ticket(admin_client)

    for i in range(3):
        resp = await admin_client.post(
            f"/api/v1/tickets/{ticket_id}/attachments",
            files={"file": (f"file{i}.txt", f"content{i}".encode(), "text/plain")},
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
        files={"file": ("to-delete.txt", b"bye", "text/plain")},
    )
    assert create_resp.status_code == 201
    att_id = create_resp.json()["id"]

    del_resp = await admin_client.delete(f"/api/v1/attachments/{att_id}")
    assert del_resp.status_code == 204

    list_resp = await admin_client.get(f"/api/v1/tickets/{ticket_id}/attachments")
    assert list_resp.json()["total"] == 0


@pytest.mark.asyncio
async def test_download_attachment(admin_client: AsyncClient):
    _, ticket_id = await _setup_ticket(admin_client)

    content = b"%PDF-1.4 download test"
    create_resp = await admin_client.post(
        f"/api/v1/tickets/{ticket_id}/attachments",
        files={"file": ("download-me.pdf", content, "application/pdf")},
    )
    assert create_resp.status_code == 201
    att_id = create_resp.json()["id"]

    dl_resp = await admin_client.get(f"/api/v1/attachments/{att_id}/download")
    assert dl_resp.status_code == 200
    assert dl_resp.content == content
    assert "application/pdf" in dl_resp.headers.get("content-type", "")
