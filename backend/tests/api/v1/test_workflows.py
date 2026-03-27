from __future__ import annotations

import pytest
from httpx import AsyncClient

from app.models import User

ORG_API = "/api/v1/organizations"
WF_API = "/api/v1/workflows"


async def _create_org(
    admin_client: AsyncClient,
    name: str = "Workflow Test Org",
    slug: str | None = None,
) -> dict:
    payload: dict = {"name": name}
    if slug is not None:
        payload["slug"] = slug
    resp = await admin_client.post(ORG_API, json=payload)
    assert resp.status_code == 201
    return resp.json()


async def _create_workflow(
    admin_client: AsyncClient,
    org_id: str,
    name: str = "Test Workflow",
    description: str | None = None,
    template_id: str | None = None,
) -> dict:
    payload: dict = {"name": name}
    if description is not None:
        payload["description"] = description
    if template_id is not None:
        payload["template_id"] = template_id
    resp = await admin_client.post(f"{ORG_API}/{org_id}/workflows", json=payload)
    assert resp.status_code == 201
    return resp.json()


async def _add_status(
    admin_client: AsyncClient,
    workflow_id: str,
    name: str,
    category: str = "to_do",
    position: int = 0,
    is_initial: bool = False,
    is_terminal: bool = False,
) -> dict:
    payload = {
        "name": name,
        "category": category,
        "position": position,
        "is_initial": is_initial,
        "is_terminal": is_terminal,
    }
    resp = await admin_client.post(f"{WF_API}/{workflow_id}/statuses", json=payload)
    assert resp.status_code == 201
    return resp.json()


async def _add_transition(
    admin_client: AsyncClient,
    workflow_id: str,
    from_status_id: str,
    to_status_id: str,
    name: str | None = None,
) -> dict:
    payload: dict = {
        "from_status_id": from_status_id,
        "to_status_id": to_status_id,
    }
    if name is not None:
        payload["name"] = name
    resp = await admin_client.post(
        f"{WF_API}/{workflow_id}/transitions", json=payload,
    )
    assert resp.status_code == 201
    return resp.json()


async def _seed_workflows(admin_client: AsyncClient, org_id: str) -> list[dict]:
    resp = await admin_client.post(f"{ORG_API}/{org_id}/workflows/seed")
    assert resp.status_code == 201
    return resp.json()


# ---------- Workflow CRUD ----------


@pytest.mark.asyncio
async def test_create_workflow(admin_client: AsyncClient):
    org = await _create_org(admin_client, slug="wf-create-org")
    wf = await _create_workflow(
        admin_client, org["id"], name="My Workflow", description="A test workflow",
    )
    assert wf["name"] == "My Workflow"
    assert wf["description"] == "A test workflow"
    assert wf["organization_id"] == org["id"]
    assert wf["is_active"] is True
    assert wf["statuses"] == []
    assert wf["transitions"] == []


@pytest.mark.asyncio
async def test_create_workflow_forbidden_non_admin(
    client: AsyncClient,
    admin_client: AsyncClient,
    test_user: User,
):
    org = await _create_org(admin_client, slug="wf-forbidden-org")
    # Add test_user as a regular member
    resp = await admin_client.post(
        f"{ORG_API}/{org['id']}/members",
        json={"user_id": str(test_user.id), "role": "member"},
    )
    assert resp.status_code == 201

    resp = await client.post(
        f"{ORG_API}/{org['id']}/workflows",
        json={"name": "Should Fail"},
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_list_workflows(admin_client: AsyncClient):
    org = await _create_org(admin_client, slug="wf-list-org")
    await _create_workflow(admin_client, org["id"], name="Workflow A")
    await _create_workflow(admin_client, org["id"], name="Workflow B")

    resp = await admin_client.get(f"{ORG_API}/{org['id']}/workflows")
    assert resp.status_code == 200
    data = resp.json()
    # 3 auto-seeded defaults + 2 manually created = 5
    assert data["total"] == 5
    names = [w["name"] for w in data["items"]]
    assert "Workflow A" in names
    assert "Workflow B" in names


@pytest.mark.asyncio
async def test_get_workflow_detail(admin_client: AsyncClient):
    org = await _create_org(admin_client, slug="wf-detail-org")
    wf = await _create_workflow(admin_client, org["id"], name="Detail Workflow")

    todo = await _add_status(admin_client, wf["id"], "To Do", is_initial=True)
    done = await _add_status(
        admin_client, wf["id"], "Done", category="done", position=1, is_terminal=True,
    )
    await _add_transition(admin_client, wf["id"], todo["id"], done["id"], name="Finish")

    resp = await admin_client.get(f"{WF_API}/{wf['id']}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "Detail Workflow"
    assert len(data["statuses"]) == 2
    assert len(data["transitions"]) == 1
    assert data["transitions"][0]["name"] == "Finish"


@pytest.mark.asyncio
async def test_update_workflow(admin_client: AsyncClient):
    org = await _create_org(admin_client, slug="wf-update-org")
    wf = await _create_workflow(admin_client, org["id"], name="Old Name")

    resp = await admin_client.patch(
        f"{WF_API}/{wf['id']}",
        json={"name": "New Name", "description": "Updated desc"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "New Name"
    assert data["description"] == "Updated desc"


@pytest.mark.asyncio
async def test_delete_workflow(admin_client: AsyncClient):
    org = await _create_org(admin_client, slug="wf-delete-org")
    wf = await _create_workflow(admin_client, org["id"], name="To Delete")

    resp = await admin_client.delete(f"{WF_API}/{wf['id']}")
    assert resp.status_code == 204

    resp = await admin_client.get(f"{WF_API}/{wf['id']}")
    assert resp.status_code == 404


# ---------- Clone ----------


@pytest.mark.asyncio
async def test_clone_from_template(admin_client: AsyncClient):
    org = await _create_org(admin_client, slug="wf-clone-org")
    resp = await admin_client.get(f"{ORG_API}/{org['id']}/workflows")
    assert resp.status_code == 200
    seeded = resp.json()["items"]
    template = seeded[0]

    cloned = await _create_workflow(
        admin_client,
        org["id"],
        name="My Cloned Workflow",
        template_id=template["id"],
    )
    assert cloned["name"] == "My Cloned Workflow"
    assert len(cloned["statuses"]) == len(template["statuses"])
    assert len(cloned["transitions"]) == len(template["transitions"])

    template_status_names = sorted(s["name"] for s in template["statuses"])
    cloned_status_names = sorted(s["name"] for s in cloned["statuses"])
    assert cloned_status_names == template_status_names


# ---------- Statuses ----------


@pytest.mark.asyncio
async def test_add_status(admin_client: AsyncClient):
    org = await _create_org(admin_client, slug="wf-addstatus-org")
    wf = await _create_workflow(admin_client, org["id"])

    status = await _add_status(
        admin_client, wf["id"], "In Progress",
        category="in_progress", position=1,
    )
    assert status["name"] == "In Progress"
    assert status["category"] == "in_progress"
    assert status["position"] == 1
    assert status["workflow_id"] == wf["id"]


@pytest.mark.asyncio
async def test_update_status(admin_client: AsyncClient):
    org = await _create_org(admin_client, slug="wf-upstatus-org")
    wf = await _create_workflow(admin_client, org["id"])
    status = await _add_status(admin_client, wf["id"], "Draft")

    resp = await admin_client.patch(
        f"{WF_API}/statuses/{status['id']}",
        json={"name": "Renamed", "category": "in_progress"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "Renamed"
    assert data["category"] == "in_progress"


@pytest.mark.asyncio
async def test_remove_status(admin_client: AsyncClient):
    org = await _create_org(admin_client, slug="wf-rmstatus-org")
    wf = await _create_workflow(admin_client, org["id"])
    status = await _add_status(admin_client, wf["id"], "Temporary")

    resp = await admin_client.delete(f"{WF_API}/statuses/{status['id']}")
    assert resp.status_code == 204

    resp = await admin_client.get(f"{WF_API}/{wf['id']}")
    assert resp.status_code == 200
    remaining_names = [s["name"] for s in resp.json()["statuses"]]
    assert "Temporary" not in remaining_names


# ---------- Transitions ----------


@pytest.mark.asyncio
async def test_add_transition(admin_client: AsyncClient):
    org = await _create_org(admin_client, slug="wf-addtrans-org")
    wf = await _create_workflow(admin_client, org["id"])
    s1 = await _add_status(admin_client, wf["id"], "Open", is_initial=True)
    s2 = await _add_status(
        admin_client, wf["id"], "Closed", category="done", position=1, is_terminal=True,
    )

    transition = await _add_transition(
        admin_client, wf["id"], s1["id"], s2["id"], name="Close",
    )
    assert transition["from_status_id"] == s1["id"]
    assert transition["to_status_id"] == s2["id"]
    assert transition["name"] == "Close"
    assert transition["workflow_id"] == wf["id"]


@pytest.mark.asyncio
async def test_remove_transition(admin_client: AsyncClient):
    org = await _create_org(admin_client, slug="wf-rmtrans-org")
    wf = await _create_workflow(admin_client, org["id"])
    s1 = await _add_status(admin_client, wf["id"], "A", is_initial=True)
    s2 = await _add_status(
        admin_client, wf["id"], "B", category="done", position=1, is_terminal=True,
    )
    transition = await _add_transition(admin_client, wf["id"], s1["id"], s2["id"])

    resp = await admin_client.delete(f"{WF_API}/transitions/{transition['id']}")
    assert resp.status_code == 204

    resp = await admin_client.get(f"{WF_API}/{wf['id']}")
    assert resp.status_code == 200
    assert len(resp.json()["transitions"]) == 0


# ---------- Validation ----------


@pytest.mark.asyncio
async def test_validate_workflow_valid(admin_client: AsyncClient):
    org = await _create_org(admin_client, slug="wf-valok-org")
    wf = await _create_workflow(admin_client, org["id"])

    s1 = await _add_status(admin_client, wf["id"], "Open", is_initial=True)
    s2 = await _add_status(
        admin_client, wf["id"], "In Progress", category="in_progress", position=1,
    )
    s3 = await _add_status(
        admin_client, wf["id"], "Done", category="done", position=2, is_terminal=True,
    )
    await _add_transition(admin_client, wf["id"], s1["id"], s2["id"])
    await _add_transition(admin_client, wf["id"], s2["id"], s3["id"])

    resp = await admin_client.get(f"{WF_API}/{wf['id']}/validate")
    assert resp.status_code == 200
    data = resp.json()
    assert data["valid"] is True
    assert data["errors"] == []


@pytest.mark.asyncio
async def test_validate_workflow_no_initial(admin_client: AsyncClient):
    org = await _create_org(admin_client, slug="wf-valnoinit-org")
    wf = await _create_workflow(admin_client, org["id"])

    await _add_status(
        admin_client, wf["id"], "Done", category="done", is_terminal=True,
    )

    resp = await admin_client.get(f"{WF_API}/{wf['id']}/validate")
    assert resp.status_code == 200
    data = resp.json()
    assert data["valid"] is False
    assert any("initial" in e.lower() for e in data["errors"])


@pytest.mark.asyncio
async def test_validate_workflow_no_terminal(admin_client: AsyncClient):
    org = await _create_org(admin_client, slug="wf-valnoterm-org")
    wf = await _create_workflow(admin_client, org["id"])

    await _add_status(admin_client, wf["id"], "Open", is_initial=True)

    resp = await admin_client.get(f"{WF_API}/{wf['id']}/validate")
    assert resp.status_code == 200
    data = resp.json()
    assert data["valid"] is False
    assert any("terminal" in e.lower() for e in data["errors"])


@pytest.mark.asyncio
async def test_validate_workflow_unreachable(admin_client: AsyncClient):
    org = await _create_org(admin_client, slug="wf-valunreach-org")
    wf = await _create_workflow(admin_client, org["id"])

    s1 = await _add_status(admin_client, wf["id"], "Open", is_initial=True)
    s2 = await _add_status(
        admin_client, wf["id"], "Done", category="done", position=1, is_terminal=True,
    )
    # Island status with no transition leading to it
    await _add_status(
        admin_client, wf["id"], "Orphan", category="in_progress", position=2,
    )
    await _add_transition(admin_client, wf["id"], s1["id"], s2["id"])

    resp = await admin_client.get(f"{WF_API}/{wf['id']}/validate")
    assert resp.status_code == 200
    data = resp.json()
    assert data["valid"] is False
    assert any("Orphan" in e for e in data["errors"])
    assert any("reachable" in e.lower() for e in data["errors"])


# ---------- Seed ----------


@pytest.mark.asyncio
async def test_seed_default_workflows(admin_client: AsyncClient):
    org = await _create_org(admin_client, slug="wf-seed-org")
    # Org creation auto-seeds defaults, so verify they exist
    resp = await admin_client.get(f"{ORG_API}/{org['id']}/workflows")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 3

    seeded = data["items"]
    names = sorted(w["name"] for w in seeded)
    assert names == ["Bug Tracking", "Scrum Standard", "Simple Kanban"]

    kanban = next(w for w in seeded if w["name"] == "Simple Kanban")
    assert len(kanban["statuses"]) == 3
    assert len(kanban["transitions"]) == 2

    scrum = next(w for w in seeded if w["name"] == "Scrum Standard")
    assert len(scrum["statuses"]) == 7
    assert len(scrum["transitions"]) == 6

    bug = next(w for w in seeded if w["name"] == "Bug Tracking")
    assert len(bug["statuses"]) == 6
    assert len(bug["transitions"]) == 5

    # Calling seed again is idempotent — returns empty, no duplicates
    re_seed = await _seed_workflows(admin_client, org["id"])
    assert len(re_seed) == 0

    resp2 = await admin_client.get(f"{ORG_API}/{org['id']}/workflows")
    assert resp2.json()["total"] == 3
