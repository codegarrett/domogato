from __future__ import annotations

import uuid

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db, get_redis
from app.core.permissions import (
    OrgRole,
    ProjectRole,
    resolve_effective_project_role,
)
from app.main import create_app
from app.models import (
    Organization,
    OrgMembership,
    Project,
    ProjectMembership,
    User,
)
from tests.conftest import FakeRedis, make_fake_user


pytestmark = pytest.mark.asyncio


# ── Helpers ──────────────────────────────────────────────────────


async def _make_user(db: AsyncSession, *, email: str, admin: bool = False) -> User:
    user = make_fake_user(email=email, display_name=email.split("@")[0], is_system_admin=admin)
    db.add(user)
    await db.flush()
    return user


async def _add_org_member(db: AsyncSession, user: User, org: Organization, role: OrgRole):
    db.add(OrgMembership(user_id=user.id, organization_id=org.id, role=role.value))
    await db.flush()


async def _add_project_member(db: AsyncSession, user: User, project: Project, role: ProjectRole):
    db.add(ProjectMembership(user_id=user.id, project_id=project.id, role=role.value))
    await db.flush()


def _client_for(user: User, db: AsyncSession) -> AsyncClient:
    app = create_app()
    _fake_redis = FakeRedis()

    async def override_get_db():
        yield db

    async def override_get_redis():
        return _fake_redis

    async def override_get_current_user():
        return user

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_redis] = override_get_redis
    app.dependency_overrides[get_current_user] = override_get_current_user
    transport = ASGITransport(app=app)
    return AsyncClient(transport=transport, base_url="http://test")


# ── resolve_effective_project_role unit tests ─────────────────────


class TestResolveEffectiveProjectRole:

    async def test_system_admin_is_owner(self, db: AsyncSession, test_org: Organization, test_project: Project):
        admin = await _make_user(db, email="sysadmin@test.com", admin=True)
        role = await resolve_effective_project_role(
            admin.id, test_project.id, test_org.id, "internal", True, db,
        )
        assert role == ProjectRole.OWNER

    async def test_explicit_project_role(self, db: AsyncSession, test_org: Organization, test_project: Project):
        dev = await _make_user(db, email="dev@test.com")
        await _add_org_member(db, dev, test_org, OrgRole.MEMBER)
        await _add_project_member(db, dev, test_project, ProjectRole.DEVELOPER)
        role = await resolve_effective_project_role(
            dev.id, test_project.id, test_org.id, "internal", False, db,
        )
        assert role == ProjectRole.DEVELOPER

    async def test_org_owner_inherits_project_owner(self, db: AsyncSession, test_org: Organization, test_project: Project):
        owner = await _make_user(db, email="orgowner@test.com")
        await _add_org_member(db, owner, test_org, OrgRole.OWNER)
        role = await resolve_effective_project_role(
            owner.id, test_project.id, test_org.id, "internal", False, db,
        )
        assert role == ProjectRole.OWNER

    async def test_org_admin_inherits_maintainer(self, db: AsyncSession, test_org: Organization, test_project: Project):
        admin = await _make_user(db, email="orgadmin@test.com")
        await _add_org_member(db, admin, test_org, OrgRole.ADMIN)
        role = await resolve_effective_project_role(
            admin.id, test_project.id, test_org.id, "internal", False, db,
        )
        assert role == ProjectRole.MAINTAINER

    async def test_org_member_internal_project_is_guest(self, db: AsyncSession, test_org: Organization, test_project: Project):
        member = await _make_user(db, email="member@test.com")
        await _add_org_member(db, member, test_org, OrgRole.MEMBER)
        role = await resolve_effective_project_role(
            member.id, test_project.id, test_org.id, "internal", False, db,
        )
        assert role == ProjectRole.GUEST

    async def test_org_member_private_project_no_access(self, db: AsyncSession, test_org: Organization):
        private_project = Project(
            organization_id=test_org.id, name="Private", key="PRIV", visibility="private",
        )
        db.add(private_project)
        await db.flush()

        member = await _make_user(db, email="privmember@test.com")
        await _add_org_member(db, member, test_org, OrgRole.MEMBER)
        role = await resolve_effective_project_role(
            member.id, private_project.id, test_org.id, "private", False, db,
        )
        assert role is None

    async def test_explicit_role_overrides_org_implicit(self, db: AsyncSession, test_org: Organization, test_project: Project):
        user = await _make_user(db, email="override@test.com")
        await _add_org_member(db, user, test_org, OrgRole.MEMBER)
        await _add_project_member(db, user, test_project, ProjectRole.MAINTAINER)
        role = await resolve_effective_project_role(
            user.id, test_project.id, test_org.id, "internal", False, db,
        )
        assert role == ProjectRole.MAINTAINER

    async def test_no_membership_returns_none(self, db: AsyncSession, test_org: Organization, test_project: Project):
        stranger = await _make_user(db, email="stranger@test.com")
        role = await resolve_effective_project_role(
            stranger.id, test_project.id, test_org.id, "internal", False, db,
        )
        assert role is None


# ── API-level permission matrix tests ────────────────────────────


class TestProjectAccessMatrix:
    """Tests that API endpoints enforce RBAC correctly."""

    async def test_guest_can_read_tickets(self, db: AsyncSession, test_org: Organization, test_project: Project):
        guest = await _make_user(db, email="guest@test.com")
        await _add_org_member(db, guest, test_org, OrgRole.MEMBER)

        async with _client_for(guest, db) as c:
            resp = await c.get(f"/api/v1/projects/{test_project.id}/tickets")
        assert resp.status_code == 200

    async def test_stranger_cannot_read_private_project(self, db: AsyncSession, test_org: Organization):
        private_project = Project(
            organization_id=test_org.id, name="Private2", key="PRV2", visibility="private",
        )
        db.add(private_project)
        await db.flush()

        stranger = await _make_user(db, email="stranger2@test.com")

        async with _client_for(stranger, db) as c:
            resp = await c.get(f"/api/v1/projects/{private_project.id}/tickets")
        assert resp.status_code == 403

    async def test_dev_can_create_ticket(self, db: AsyncSession, test_org: Organization, test_project: Project):
        from app.models.workflow import Workflow, WorkflowStatus
        wf = Workflow(organization_id=test_org.id, name="Dev WF", is_active=True)
        db.add(wf)
        await db.flush()
        todo = WorkflowStatus(workflow_id=wf.id, name="Open", category="todo", is_initial=True, is_terminal=False, position=0)
        db.add(todo)
        await db.flush()
        test_project.default_workflow_id = wf.id
        await db.flush()

        dev = await _make_user(db, email="dev2@test.com")
        await _add_org_member(db, dev, test_org, OrgRole.MEMBER)
        await _add_project_member(db, dev, test_project, ProjectRole.DEVELOPER)

        async with _client_for(dev, db) as c:
            resp = await c.post(
                f"/api/v1/projects/{test_project.id}/tickets",
                json={"title": "Dev ticket", "ticket_type": "task", "priority": "medium"},
            )
        assert resp.status_code == 201

    async def test_guest_cannot_create_ticket(self, db: AsyncSession, test_org: Organization, test_project: Project):
        guest = await _make_user(db, email="guest_no_create@test.com")
        await _add_org_member(db, guest, test_org, OrgRole.MEMBER)

        async with _client_for(guest, db) as c:
            resp = await c.post(
                f"/api/v1/projects/{test_project.id}/tickets",
                json={"title": "Test", "ticket_type": "task", "priority": "medium"},
            )
        assert resp.status_code == 403


class TestOrgAccessMatrix:
    """Tests that org-level endpoints enforce RBAC correctly."""

    async def test_org_member_can_list_projects(self, db: AsyncSession, test_org: Organization):
        member = await _make_user(db, email="orgmember@test.com")
        await _add_org_member(db, member, test_org, OrgRole.MEMBER)

        async with _client_for(member, db) as c:
            resp = await c.get(f"/api/v1/organizations/{test_org.id}/projects")
        assert resp.status_code == 200

    async def test_non_member_sees_empty_project_list(self, db: AsyncSession, test_org: Organization):
        stranger = await _make_user(db, email="orgstranger@test.com")

        async with _client_for(stranger, db) as c:
            resp = await c.get(f"/api/v1/organizations/{test_org.id}/projects")
        assert resp.status_code == 200
        assert resp.json()["total"] == 0

    async def test_non_member_cannot_view_org_members(self, db: AsyncSession, test_org: Organization):
        stranger = await _make_user(db, email="orgstranger2@test.com")

        async with _client_for(stranger, db) as c:
            resp = await c.get(f"/api/v1/organizations/{test_org.id}/members")
        assert resp.status_code == 403

    async def test_org_admin_can_create_project(self, db: AsyncSession, test_org: Organization):
        admin = await _make_user(db, email="orgadmin_create@test.com")
        await _add_org_member(db, admin, test_org, OrgRole.ADMIN)

        async with _client_for(admin, db) as c:
            resp = await c.post(
                f"/api/v1/organizations/{test_org.id}/projects",
                json={"name": "New Proj", "key": "NP", "visibility": "internal"},
            )
        assert resp.status_code == 201

    async def test_org_member_cannot_create_project(self, db: AsyncSession, test_org: Organization):
        member = await _make_user(db, email="orgmember_nocreate@test.com")
        await _add_org_member(db, member, test_org, OrgRole.MEMBER)

        async with _client_for(member, db) as c:
            resp = await c.post(
                f"/api/v1/organizations/{test_org.id}/projects",
                json={"name": "Blocked", "key": "BL", "visibility": "internal"},
            )
        assert resp.status_code == 403
