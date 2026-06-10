from __future__ import annotations

import uuid

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db, get_redis
from app.core.permissions import OrgRole, ProjectRole
from app.main import create_app
from app.models import Organization, OrgMembership, Project, ProjectMembership, User
from app.services.workflow_service import seed_default_workflows
from tests.conftest import FakeRedis, make_fake_user

pytestmark = pytest.mark.asyncio

ORG_API = "/api/v1/organizations"
PROJECT_API = "/api/v1/projects"
TICKET_API = "/api/v1/tickets"
STORY_API = "/api/v1/projects"
REPORT_API = "/api/v1/projects"


async def _make_user(db: AsyncSession, *, email: str, admin: bool = False) -> User:
    user = make_fake_user(email=email, display_name=email.split("@")[0], is_system_admin=admin)
    db.add(user)
    await db.flush()
    return user


async def _add_org_member(db: AsyncSession, user: User, org: Organization, role: OrgRole) -> None:
    db.add(OrgMembership(user_id=user.id, organization_id=org.id, role=role.value))
    await db.flush()


async def _add_project_member(
    db: AsyncSession, user: User, project: Project, role: ProjectRole,
) -> None:
    db.add(ProjectMembership(user_id=user.id, project_id=project.id, role=role.value))
    await db.flush()


def _client_for(user: User, db: AsyncSession) -> AsyncClient:
    app = create_app()
    fake_redis = FakeRedis()

    async def override_get_db():
        yield db

    async def override_get_redis():
        return fake_redis

    async def override_get_current_user():
        return user

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_redis] = override_get_redis
    app.dependency_overrides[get_current_user] = override_get_current_user
    transport = ASGITransport(app=app)
    return AsyncClient(transport=transport, base_url="http://test")


async def _workflow_statuses(
    admin_client: AsyncClient,
    org: Organization,
) -> tuple[dict, dict, dict]:
    wf_resp = await admin_client.get(f"{ORG_API}/{org.id}/workflows")
    assert wf_resp.status_code == 200
    kanban = next(w for w in wf_resp.json()["items"] if "Kanban" in w["name"])
    initial_status = next(s for s in kanban["statuses"] if s["is_initial"])
    in_progress = next(
        s for s in kanban["statuses"]
        if not s["is_initial"] and not s.get("is_terminal", False)
    )
    return kanban, initial_status, in_progress


@pytest.fixture
async def rbac_context(db: AsyncSession, admin_user: User):
    """Org + internal project with workflow; users for each project role."""
    org = Organization(name="RBAC Org", slug=f"rbac-org-{uuid.uuid4().hex[:8]}")
    db.add(org)
    await db.flush()
    workflows = await seed_default_workflows(db, org.id)
    kanban_wf = next(w for w in workflows if w.name == "Simple Kanban")

    project = Project(
        organization_id=org.id,
        name="RBAC Project",
        key=f"RB{uuid.uuid4().hex[:4].upper()}",
        visibility="internal",
        default_workflow_id=kanban_wf.id,
    )
    db.add(project)
    await db.flush()

    guest = await _make_user(db, email="guest@rbac.test")
    reporter = await _make_user(db, email="reporter@rbac.test")
    developer = await _make_user(db, email="developer@rbac.test")
    maintainer = await _make_user(db, email="maintainer@rbac.test")
    owner = await _make_user(db, email="owner@rbac.test")

    for user in (guest, reporter, developer, maintainer, owner):
        await _add_org_member(db, user, org, OrgRole.MEMBER)

    await _add_project_member(db, reporter, project, ProjectRole.REPORTER)
    await _add_project_member(db, developer, project, ProjectRole.DEVELOPER)
    await _add_project_member(db, maintainer, project, ProjectRole.MAINTAINER)
    await _add_project_member(db, owner, project, ProjectRole.OWNER)

    async with _client_for(admin_user, db) as admin_client:
        _, initial_status, in_progress = await _workflow_statuses(admin_client, org)

        refined_story = (
            await admin_client.post(
                f"{STORY_API}/{project.id}/user-stories",
                json={"title": "Ready for tickets"},
            )
        ).json()
        await admin_client.patch(
            f"{STORY_API}/{project.id}/user-stories/{refined_story['id']}",
            json={
                "story_title": "As a user I want X",
                "story_body": "Body",
                "story_acceptance_criteria": "- AC1",
            },
        )

    async with _client_for(developer, db) as dev_client:
        dev_story = (
            await dev_client.post(
                f"{STORY_API}/{project.id}/user-stories",
                json={"title": "Developer story"},
            )
        ).json()
        dev_report = (
            await dev_client.post(
                f"{REPORT_API}/{project.id}/issue-reports",
                json={"title": "Developer report", "description": "From dev"},
            )
        ).json()

    async with _client_for(reporter, db) as reporter_client:
        reporter_story = (
            await reporter_client.post(
                f"{STORY_API}/{project.id}/user-stories",
                json={"title": "Reporter story"},
            )
        ).json()
        reporter_report = (
            await reporter_client.post(
                f"{REPORT_API}/{project.id}/issue-reports",
                json={"title": "Reporter report", "description": "From reporter"},
            )
        ).json()

    async with _client_for(admin_user, db) as admin_client:
        ticket = (
            await admin_client.post(
                f"{PROJECT_API}/{project.id}/tickets",
                json={"title": "RBAC Ticket", "ticket_type": "task", "priority": "medium"},
            )
        ).json()

    return {
        "org": org,
        "project": project,
        "guest": guest,
        "reporter": reporter,
        "developer": developer,
        "maintainer": maintainer,
        "owner": owner,
        "dev_story": dev_story,
        "reporter_story": reporter_story,
        "refined_story": refined_story,
        "ticket": ticket,
        "dev_report": dev_report,
        "reporter_report": reporter_report,
        "initial_status": initial_status,
        "in_progress": in_progress,
    }


def _assert_forbidden(resp, substring: str) -> None:
    assert resp.status_code == 403
    body = resp.json()
    detail = body.get("detail") or body.get("error", {}).get("message", "")
    assert substring in detail


class TestReporterPermissions:
    async def test_reporter_creates_user_story(self, db: AsyncSession, rbac_context: dict):
        reporter = rbac_context["reporter"]
        project = rbac_context["project"]
        async with _client_for(reporter, db) as client:
            resp = await client.post(
                f"{STORY_API}/{project.id}/user-stories",
                json={"title": "New reporter story"},
            )
        assert resp.status_code == 201

    async def test_reporter_patches_own_story_status(self, db: AsyncSession, rbac_context: dict):
        reporter = rbac_context["reporter"]
        project = rbac_context["project"]
        story = rbac_context["reporter_story"]
        async with _client_for(reporter, db) as client:
            resp = await client.patch(
                f"{STORY_API}/{project.id}/user-stories/{story['id']}",
                json={"status": "in_progress"},
            )
        assert resp.status_code == 200
        assert resp.json()["status"] == "in_progress"

    async def test_reporter_patches_other_story_refined_fields(
        self, db: AsyncSession, rbac_context: dict,
    ):
        reporter = rbac_context["reporter"]
        project = rbac_context["project"]
        story = rbac_context["dev_story"]
        async with _client_for(reporter, db) as client:
            resp = await client.patch(
                f"{STORY_API}/{project.id}/user-stories/{story['id']}",
                json={
                    "status": "in_progress",
                    "story_title": "As a PO I refine this",
                    "story_body": "Refined by reporter",
                },
            )
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "in_progress"
        assert data["story_title"] == "As a PO I refine this"

    async def test_reporter_cannot_create_ticket(self, db: AsyncSession, rbac_context: dict):
        reporter = rbac_context["reporter"]
        project = rbac_context["project"]
        async with _client_for(reporter, db) as client:
            resp = await client.post(
                f"{PROJECT_API}/{project.id}/tickets",
                json={"title": "Blocked", "ticket_type": "task", "priority": "medium"},
            )
        _assert_forbidden(resp, "developer role or higher to create tickets")

    async def test_reporter_transitions_any_ticket(self, db: AsyncSession, rbac_context: dict):
        reporter = rbac_context["reporter"]
        ticket = rbac_context["ticket"]
        in_progress = rbac_context["in_progress"]
        async with _client_for(reporter, db) as client:
            resp = await client.post(
                f"{TICKET_API}/{ticket['id']}/transition",
                json={"workflow_status_id": in_progress["id"]},
            )
        assert resp.status_code == 200
        assert resp.json()["workflow_status_id"] == in_progress["id"]

    async def test_reporter_cannot_patch_ticket_fields(self, db: AsyncSession, rbac_context: dict):
        reporter = rbac_context["reporter"]
        ticket = rbac_context["ticket"]
        async with _client_for(reporter, db) as client:
            resp = await client.patch(
                f"{TICKET_API}/{ticket['id']}",
                json={"title": "Reporter edit"},
            )
        _assert_forbidden(resp, "developer role or higher to update tickets")

    async def test_reporter_creates_issue_report(self, db: AsyncSession, rbac_context: dict):
        reporter = rbac_context["reporter"]
        project = rbac_context["project"]
        async with _client_for(reporter, db) as client:
            resp = await client.post(
                f"{REPORT_API}/{project.id}/issue-reports",
                json={"title": "Reporter issue", "description": "Details"},
            )
        assert resp.status_code == 201

    async def test_reporter_patches_own_issue_report(self, db: AsyncSession, rbac_context: dict):
        reporter = rbac_context["reporter"]
        project = rbac_context["project"]
        report = rbac_context["reporter_report"]
        async with _client_for(reporter, db) as client:
            resp = await client.patch(
                f"{REPORT_API}/{project.id}/issue-reports/{report['id']}",
                json={"title": "Updated by reporter"},
            )
        assert resp.status_code == 200
        assert resp.json()["title"] == "Updated by reporter"

    async def test_reporter_cannot_patch_other_issue_report(
        self, db: AsyncSession, rbac_context: dict,
    ):
        reporter = rbac_context["reporter"]
        project = rbac_context["project"]
        report = rbac_context["dev_report"]
        async with _client_for(reporter, db) as client:
            resp = await client.patch(
                f"{REPORT_API}/{project.id}/issue-reports/{report['id']}",
                json={"title": "Should fail"},
            )
        _assert_forbidden(resp, "only edit issue reports you created")

    async def test_reporter_cannot_create_tickets_from_story(
        self, db: AsyncSession, rbac_context: dict,
    ):
        reporter = rbac_context["reporter"]
        project = rbac_context["project"]
        story = rbac_context["refined_story"]
        async with _client_for(reporter, db) as client:
            resp = await client.post(
                f"{STORY_API}/{project.id}/user-stories/create-tickets",
                json={"user_story_ids": [story["id"]]},
            )
        _assert_forbidden(resp, "developer role or higher")

    async def test_reporter_cannot_create_ticket_from_reports(
        self, db: AsyncSession, rbac_context: dict,
    ):
        reporter = rbac_context["reporter"]
        project = rbac_context["project"]
        report = rbac_context["reporter_report"]
        async with _client_for(reporter, db) as client:
            resp = await client.post(
                f"{REPORT_API}/{project.id}/issue-reports/create-ticket",
                json={"issue_report_ids": [report["id"]]},
            )
        _assert_forbidden(resp, "developer role or higher")


class TestGuestPermissions:
    async def test_guest_can_read_tickets(self, db: AsyncSession, rbac_context: dict):
        guest = rbac_context["guest"]
        project = rbac_context["project"]
        async with _client_for(guest, db) as client:
            resp = await client.get(f"{PROJECT_API}/{project.id}/tickets")
        assert resp.status_code == 200

    async def test_guest_cannot_create_user_story(self, db: AsyncSession, rbac_context: dict):
        guest = rbac_context["guest"]
        project = rbac_context["project"]
        async with _client_for(guest, db) as client:
            resp = await client.post(
                f"{STORY_API}/{project.id}/user-stories",
                json={"title": "Guest story"},
            )
        _assert_forbidden(resp, "reporter role or higher")

    async def test_guest_cannot_patch_user_story(self, db: AsyncSession, rbac_context: dict):
        guest = rbac_context["guest"]
        project = rbac_context["project"]
        story = rbac_context["dev_story"]
        async with _client_for(guest, db) as client:
            resp = await client.patch(
                f"{STORY_API}/{project.id}/user-stories/{story['id']}",
                json={"status": "in_progress"},
            )
        _assert_forbidden(resp, "reporter role or higher to edit user stories")

    async def test_guest_cannot_transition_ticket(self, db: AsyncSession, rbac_context: dict):
        guest = rbac_context["guest"]
        ticket = rbac_context["ticket"]
        in_progress = rbac_context["in_progress"]
        async with _client_for(guest, db) as client:
            resp = await client.post(
                f"{TICKET_API}/{ticket['id']}/transition",
                json={"workflow_status_id": in_progress["id"]},
            )
        _assert_forbidden(resp, "reporter role or higher to transition ticket status")


class TestDeveloperPermissions:
    async def test_developer_creates_ticket(self, db: AsyncSession, rbac_context: dict):
        developer = rbac_context["developer"]
        project = rbac_context["project"]
        async with _client_for(developer, db) as client:
            resp = await client.post(
                f"{PROJECT_API}/{project.id}/tickets",
                json={"title": "Dev ticket", "ticket_type": "task", "priority": "medium"},
            )
        assert resp.status_code == 201

    async def test_developer_creates_tickets_from_story(
        self, db: AsyncSession, rbac_context: dict,
    ):
        developer = rbac_context["developer"]
        project = rbac_context["project"]
        story = rbac_context["refined_story"]
        async with _client_for(developer, db) as client:
            resp = await client.post(
                f"{STORY_API}/{project.id}/user-stories/create-tickets",
                json={"user_story_ids": [story["id"]]},
            )
        assert resp.status_code == 201
        assert len(resp.json()) == 1


@pytest.mark.parametrize(
    "role_key,minimum_action",
    [
        ("maintainer", "create_ticket"),
        ("owner", "create_ticket"),
    ],
)
class TestElevatedRoles:
    async def test_maintainer_and_owner_can_create_tickets(
        self, db: AsyncSession, rbac_context: dict, role_key: str, minimum_action: str,
    ):
        user = rbac_context[role_key]
        project = rbac_context["project"]
        async with _client_for(user, db) as client:
            resp = await client.post(
                f"{PROJECT_API}/{project.id}/tickets",
                json={"title": f"{role_key} ticket", "ticket_type": "task", "priority": "medium"},
            )
        assert resp.status_code == 201
