from __future__ import annotations

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Organization, OrgMembership, Project, ProjectMembership, User
from tests.conftest import create_test_app, make_fake_user


@pytest_asyncio.fixture
async def member_client(
    db_session: AsyncSession,
    test_user: User,
    test_org: Organization,
    test_project: Project,
) -> AsyncClient:
    """Client where test_user is a Developer on the test project."""
    db_session.add(
        OrgMembership(
            user_id=test_user.id, organization_id=test_org.id, role="member"
        )
    )
    db_session.add(
        ProjectMembership(
            user_id=test_user.id, project_id=test_project.id, role="developer"
        )
    )
    await db_session.flush()

    app = create_test_app(current_user=test_user, db_override=db_session)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _create_space(
    client: AsyncClient, project_id, *, name: str = "Test Space"
) -> dict:
    resp = await client.post(
        f"/api/v1/projects/{project_id}/kb/spaces", json={"name": name}
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


async def _create_page(
    client: AsyncClient,
    space_id: str,
    *,
    title: str = "Test Page",
    content_markdown: str = "",
    parent_page_id: str | None = None,
) -> dict:
    payload: dict = {"title": title, "content_markdown": content_markdown}
    if parent_page_id is not None:
        payload["parent_page_id"] = parent_page_id
    resp = await client.post(
        f"/api/v1/kb/spaces/{space_id}/pages", json=payload
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


# ---------------------------------------------------------------------------
# 1. Space CRUD
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
class TestKBSpaces:
    async def test_list_spaces_empty(self, admin_client: AsyncClient, test_project: Project):
        resp = await admin_client.get(
            f"/api/v1/projects/{test_project.id}/kb/spaces"
        )
        assert resp.status_code == 200
        assert resp.json() == []

    async def test_create_space(self, admin_client: AsyncClient, test_project: Project):
        resp = await admin_client.post(
            f"/api/v1/projects/{test_project.id}/kb/spaces",
            json={"name": "Engineering Docs", "description": "Technical documentation"},
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "Engineering Docs"
        assert data["slug"] == "engineering-docs"
        assert data["project_id"] == str(test_project.id)
        assert data["is_archived"] is False

    async def test_create_space_with_icon(self, admin_client: AsyncClient, test_project: Project):
        resp = await admin_client.post(
            f"/api/v1/projects/{test_project.id}/kb/spaces",
            json={"name": "Design", "icon": "palette"},
        )
        assert resp.status_code == 201
        assert resp.json()["icon"] == "palette"

    async def test_list_spaces_returns_created(
        self, admin_client: AsyncClient, test_project: Project
    ):
        await _create_space(admin_client, test_project.id, name="Alpha")
        await _create_space(admin_client, test_project.id, name="Beta")
        resp = await admin_client.get(
            f"/api/v1/projects/{test_project.id}/kb/spaces"
        )
        assert resp.status_code == 200
        names = [s["name"] for s in resp.json()]
        assert "Alpha" in names
        assert "Beta" in names

    async def test_get_space_by_slug(self, admin_client: AsyncClient, test_project: Project):
        await admin_client.post(
            f"/api/v1/projects/{test_project.id}/kb/spaces",
            json={"name": "My Space"},
        )
        resp = await admin_client.get(
            f"/api/v1/projects/{test_project.id}/kb/spaces/my-space"
        )
        assert resp.status_code == 200
        assert resp.json()["name"] == "My Space"

    async def test_get_space_not_found(self, admin_client: AsyncClient, test_project: Project):
        resp = await admin_client.get(
            f"/api/v1/projects/{test_project.id}/kb/spaces/nonexistent"
        )
        assert resp.status_code == 404

    async def test_update_space(self, admin_client: AsyncClient, test_project: Project):
        create = await admin_client.post(
            f"/api/v1/projects/{test_project.id}/kb/spaces",
            json={"name": "Old Name"},
        )
        slug = create.json()["slug"]
        resp = await admin_client.patch(
            f"/api/v1/projects/{test_project.id}/kb/spaces/{slug}",
            json={"name": "New Name"},
        )
        assert resp.status_code == 200
        assert resp.json()["name"] == "New Name"

    async def test_update_space_description(
        self, admin_client: AsyncClient, test_project: Project
    ):
        space = await _create_space(admin_client, test_project.id, name="Desc Space")
        resp = await admin_client.patch(
            f"/api/v1/projects/{test_project.id}/kb/spaces/{space['slug']}",
            json={"description": "Updated description"},
        )
        assert resp.status_code == 200
        assert resp.json()["description"] == "Updated description"

    async def test_archive_space(self, admin_client: AsyncClient, test_project: Project):
        create = await admin_client.post(
            f"/api/v1/projects/{test_project.id}/kb/spaces",
            json={"name": "Temp"},
        )
        slug = create.json()["slug"]
        resp = await admin_client.delete(
            f"/api/v1/projects/{test_project.id}/kb/spaces/{slug}"
        )
        assert resp.status_code == 200
        assert resp.json()["is_archived"] is True

    async def test_space_page_count(self, admin_client: AsyncClient, test_project: Project):
        space = await _create_space(admin_client, test_project.id, name="Counted")
        await _create_page(admin_client, space["id"], title="P1")
        await _create_page(admin_client, space["id"], title="P2")
        resp = await admin_client.get(
            f"/api/v1/projects/{test_project.id}/kb/spaces/{space['slug']}"
        )
        assert resp.status_code == 200
        assert resp.json()["page_count"] == 2


# ---------------------------------------------------------------------------
# 2. Page CRUD
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
class TestKBPages:
    async def test_create_page(self, admin_client: AsyncClient, test_project: Project):
        space = await _create_space(admin_client, test_project.id)
        resp = await admin_client.post(
            f"/api/v1/kb/spaces/{space['id']}/pages",
            json={"title": "Getting Started", "content_markdown": "# Welcome"},
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["title"] == "Getting Started"
        assert data["slug"] == "getting-started"
        assert data["space_id"] == space["id"]
        assert data["is_published"] is True
        assert data["is_deleted"] is False

    async def test_create_page_unpublished(
        self, admin_client: AsyncClient, test_project: Project
    ):
        space = await _create_space(admin_client, test_project.id)
        resp = await admin_client.post(
            f"/api/v1/kb/spaces/{space['id']}/pages",
            json={"title": "Draft", "is_published": False},
        )
        assert resp.status_code == 201
        assert resp.json()["is_published"] is False

    async def test_get_page(self, admin_client: AsyncClient, test_project: Project):
        space = await _create_space(admin_client, test_project.id)
        create = await _create_page(admin_client, space["id"], title="Page 1")
        page_id = create["id"]
        resp = await admin_client.get(f"/api/v1/kb/pages/{page_id}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["title"] == "Page 1"
        assert data["id"] == page_id

    async def test_get_page_not_found(self, admin_client: AsyncClient):
        import uuid

        resp = await admin_client.get(f"/api/v1/kb/pages/{uuid.uuid4()}")
        assert resp.status_code == 404

    async def test_update_page(self, admin_client: AsyncClient, test_project: Project):
        space = await _create_space(admin_client, test_project.id)
        create = await _create_page(admin_client, space["id"], title="Draft")
        page_id = create["id"]
        resp = await admin_client.patch(
            f"/api/v1/kb/pages/{page_id}",
            json={"title": "Final Title", "content_markdown": "Updated content"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["title"] == "Final Title"
        assert data["content_markdown"] == "Updated content"

    async def test_update_page_publish_toggle(
        self, admin_client: AsyncClient, test_project: Project
    ):
        space = await _create_space(admin_client, test_project.id)
        create = await _create_page(admin_client, space["id"], title="Toggle")
        page_id = create["id"]
        resp = await admin_client.patch(
            f"/api/v1/kb/pages/{page_id}", json={"is_published": False}
        )
        assert resp.status_code == 200
        assert resp.json()["is_published"] is False

    async def test_delete_page(self, admin_client: AsyncClient, test_project: Project):
        space = await _create_space(admin_client, test_project.id)
        create = await _create_page(admin_client, space["id"], title="To Delete")
        page_id = create["id"]
        resp = await admin_client.delete(f"/api/v1/kb/pages/{page_id}")
        assert resp.status_code == 204
        get_resp = await admin_client.get(f"/api/v1/kb/pages/{page_id}")
        assert get_resp.status_code == 404

    async def test_page_tree(self, admin_client: AsyncClient, test_project: Project):
        space = await _create_space(admin_client, test_project.id)
        parent = await _create_page(admin_client, space["id"], title="Parent")
        await _create_page(
            admin_client,
            space["id"],
            title="Child",
            parent_page_id=parent["id"],
        )
        resp = await admin_client.get(f"/api/v1/kb/spaces/{space['id']}/pages")
        assert resp.status_code == 200
        tree = resp.json()
        assert len(tree) == 1
        assert tree[0]["title"] == "Parent"
        assert len(tree[0]["children"]) == 1
        assert tree[0]["children"][0]["title"] == "Child"

    async def test_page_tree_multiple_roots(
        self, admin_client: AsyncClient, test_project: Project
    ):
        space = await _create_space(admin_client, test_project.id)
        await _create_page(admin_client, space["id"], title="Root A")
        await _create_page(admin_client, space["id"], title="Root B")
        resp = await admin_client.get(f"/api/v1/kb/spaces/{space['id']}/pages")
        assert resp.status_code == 200
        tree = resp.json()
        assert len(tree) == 2

    async def test_page_ancestors(self, admin_client: AsyncClient, test_project: Project):
        space = await _create_space(admin_client, test_project.id)
        p1 = await _create_page(admin_client, space["id"], title="Level 1")
        p2 = await _create_page(
            admin_client, space["id"], title="Level 2", parent_page_id=p1["id"]
        )
        resp = await admin_client.get(f"/api/v1/kb/pages/{p2['id']}/ancestors")
        assert resp.status_code == 200
        ancestors = resp.json()
        assert len(ancestors) == 1
        assert ancestors[0]["title"] == "Level 1"

    async def test_page_ancestors_deep(
        self, admin_client: AsyncClient, test_project: Project
    ):
        space = await _create_space(admin_client, test_project.id)
        p1 = await _create_page(admin_client, space["id"], title="Grandparent")
        p2 = await _create_page(
            admin_client, space["id"], title="Parent", parent_page_id=p1["id"]
        )
        p3 = await _create_page(
            admin_client, space["id"], title="Child", parent_page_id=p2["id"]
        )
        resp = await admin_client.get(f"/api/v1/kb/pages/{p3['id']}/ancestors")
        assert resp.status_code == 200
        ancestors = resp.json()
        assert len(ancestors) == 2
        titles = [a["title"] for a in ancestors]
        assert "Grandparent" in titles
        assert "Parent" in titles

    async def test_page_children(self, admin_client: AsyncClient, test_project: Project):
        space = await _create_space(admin_client, test_project.id)
        parent = await _create_page(admin_client, space["id"], title="Parent")
        await _create_page(
            admin_client, space["id"], title="Kid 1", parent_page_id=parent["id"]
        )
        await _create_page(
            admin_client, space["id"], title="Kid 2", parent_page_id=parent["id"]
        )
        resp = await admin_client.get(f"/api/v1/kb/pages/{parent['id']}/children")
        assert resp.status_code == 200
        children = resp.json()
        assert len(children) == 2

    async def test_move_page(self, admin_client: AsyncClient, test_project: Project):
        space = await _create_space(admin_client, test_project.id)
        p1 = await _create_page(admin_client, space["id"], title="A")
        p2 = await _create_page(admin_client, space["id"], title="B")
        resp = await admin_client.post(
            f"/api/v1/kb/pages/{p2['id']}/move",
            json={"parent_page_id": p1["id"], "position": 0},
        )
        assert resp.status_code == 200
        assert resp.json()["parent_page_id"] == p1["id"]

    async def test_move_page_to_root(
        self, admin_client: AsyncClient, test_project: Project
    ):
        space = await _create_space(admin_client, test_project.id)
        parent = await _create_page(admin_client, space["id"], title="Parent")
        child = await _create_page(
            admin_client,
            space["id"],
            title="Child",
            parent_page_id=parent["id"],
        )
        resp = await admin_client.post(
            f"/api/v1/kb/pages/{child['id']}/move",
            json={"parent_page_id": None, "position": 0},
        )
        assert resp.status_code == 200
        assert resp.json()["parent_page_id"] is None

    async def test_page_version_and_comment_counts(
        self, admin_client: AsyncClient, test_project: Project
    ):
        space = await _create_space(admin_client, test_project.id)
        page = await _create_page(
            admin_client, space["id"], title="Counted", content_markdown="v1"
        )
        await admin_client.patch(
            f"/api/v1/kb/pages/{page['id']}",
            json={"content_markdown": "v2"},
        )
        await admin_client.post(
            f"/api/v1/kb/pages/{page['id']}/comments",
            json={"body": "Nice"},
        )
        resp = await admin_client.get(f"/api/v1/kb/pages/{page['id']}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["version_count"] >= 2
        assert data["comment_count"] >= 1


# ---------------------------------------------------------------------------
# 3. Version History
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
class TestKBVersions:
    async def _setup_page(
        self, admin_client: AsyncClient, project_id
    ) -> tuple[str, str]:
        space = await _create_space(admin_client, project_id, name="Versioned Space")
        page = await _create_page(
            admin_client,
            space["id"],
            title="Versioned Page",
            content_markdown="v1",
        )
        return space["id"], page["id"]

    async def test_initial_version_created(
        self, admin_client: AsyncClient, test_project: Project
    ):
        _, page_id = await self._setup_page(admin_client, test_project.id)
        resp = await admin_client.get(f"/api/v1/kb/pages/{page_id}/versions")
        assert resp.status_code == 200
        data = resp.json()
        items = data.get("items", data) if isinstance(data, dict) else data
        assert len(items) >= 1

    async def test_update_creates_new_version(
        self, admin_client: AsyncClient, test_project: Project
    ):
        _, page_id = await self._setup_page(admin_client, test_project.id)
        await admin_client.patch(
            f"/api/v1/kb/pages/{page_id}", json={"content_markdown": "v2"}
        )
        resp = await admin_client.get(f"/api/v1/kb/pages/{page_id}/versions")
        assert resp.status_code == 200
        data = resp.json()
        items = data.get("items", data) if isinstance(data, dict) else data
        assert len(items) >= 2

    async def test_version_ordering(
        self, admin_client: AsyncClient, test_project: Project
    ):
        _, page_id = await self._setup_page(admin_client, test_project.id)
        await admin_client.patch(
            f"/api/v1/kb/pages/{page_id}", json={"content_markdown": "v2"}
        )
        await admin_client.patch(
            f"/api/v1/kb/pages/{page_id}", json={"content_markdown": "v3"}
        )
        resp = await admin_client.get(f"/api/v1/kb/pages/{page_id}/versions")
        assert resp.status_code == 200
        items = resp.json().get("items", resp.json())
        version_numbers = [v["version_number"] for v in items]
        assert version_numbers == sorted(version_numbers, reverse=True)

    async def test_diff_versions(
        self, admin_client: AsyncClient, test_project: Project
    ):
        _, page_id = await self._setup_page(admin_client, test_project.id)
        await admin_client.patch(
            f"/api/v1/kb/pages/{page_id}", json={"content_markdown": "v2 content"}
        )
        versions_resp = await admin_client.get(
            f"/api/v1/kb/pages/{page_id}/versions"
        )
        data = versions_resp.json()
        items = data.get("items", data) if isinstance(data, dict) else data
        assert len(items) >= 2
        v_old = items[-1]["id"]
        v_new = items[0]["id"]
        diff_resp = await admin_client.get(
            f"/api/v1/kb/pages/{page_id}/versions/{v_old}/diff/{v_new}"
        )
        assert diff_resp.status_code == 200
        diff_data = diff_resp.json()
        assert "diff" in diff_data
        assert "stats" in diff_data
        assert "from_version" in diff_data
        assert "to_version" in diff_data

    async def test_diff_stats_reflect_changes(
        self, admin_client: AsyncClient, test_project: Project
    ):
        _, page_id = await self._setup_page(admin_client, test_project.id)
        await admin_client.patch(
            f"/api/v1/kb/pages/{page_id}", json={"content_markdown": "completely different"}
        )
        versions_resp = await admin_client.get(
            f"/api/v1/kb/pages/{page_id}/versions"
        )
        items = versions_resp.json().get("items", versions_resp.json())
        v_old, v_new = items[-1]["id"], items[0]["id"]
        diff_resp = await admin_client.get(
            f"/api/v1/kb/pages/{page_id}/versions/{v_old}/diff/{v_new}"
        )
        stats = diff_resp.json()["stats"]
        assert stats["added"] + stats["removed"] > 0

    async def test_restore_version(
        self, admin_client: AsyncClient, test_project: Project
    ):
        _, page_id = await self._setup_page(admin_client, test_project.id)
        await admin_client.patch(
            f"/api/v1/kb/pages/{page_id}", json={"content_markdown": "v2 different"}
        )
        versions_resp = await admin_client.get(
            f"/api/v1/kb/pages/{page_id}/versions"
        )
        data = versions_resp.json()
        items = data.get("items", data) if isinstance(data, dict) else data
        old_version_id = items[-1]["id"]
        restore_resp = await admin_client.post(
            f"/api/v1/kb/pages/{page_id}/versions/{old_version_id}/restore"
        )
        assert restore_resp.status_code == 200
        restored_page = restore_resp.json()
        assert restored_page["content_markdown"] == "v1"

    async def test_restore_creates_new_version(
        self, admin_client: AsyncClient, test_project: Project
    ):
        _, page_id = await self._setup_page(admin_client, test_project.id)
        await admin_client.patch(
            f"/api/v1/kb/pages/{page_id}", json={"content_markdown": "v2"}
        )
        versions_before = await admin_client.get(
            f"/api/v1/kb/pages/{page_id}/versions"
        )
        count_before = versions_before.json()["total"]

        items = versions_before.json()["items"]
        old_version_id = items[-1]["id"]
        await admin_client.post(
            f"/api/v1/kb/pages/{page_id}/versions/{old_version_id}/restore"
        )

        versions_after = await admin_client.get(
            f"/api/v1/kb/pages/{page_id}/versions"
        )
        count_after = versions_after.json()["total"]
        assert count_after == count_before + 1


# ---------------------------------------------------------------------------
# 4. Comments
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
class TestKBComments:
    async def _setup_page(self, admin_client: AsyncClient, project_id) -> str:
        space = await _create_space(
            admin_client, project_id, name="Comment Space"
        )
        page = await _create_page(
            admin_client, space["id"], title="Commented Page"
        )
        return page["id"]

    async def test_create_comment(
        self, admin_client: AsyncClient, test_project: Project
    ):
        page_id = await self._setup_page(admin_client, test_project.id)
        resp = await admin_client.post(
            f"/api/v1/kb/pages/{page_id}/comments",
            json={"body": "Great article!"},
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["body"] == "Great article!"
        assert data["page_id"] == page_id
        assert data["is_deleted"] is False

    async def test_create_comment_has_author(
        self, admin_client: AsyncClient, test_project: Project, admin_user: User
    ):
        page_id = await self._setup_page(admin_client, test_project.id)
        resp = await admin_client.post(
            f"/api/v1/kb/pages/{page_id}/comments",
            json={"body": "Authored"},
        )
        assert resp.status_code == 201
        author = resp.json()["author"]
        assert author["id"] == str(admin_user.id)
        assert author["display_name"] == admin_user.display_name

    async def test_list_comments(
        self, admin_client: AsyncClient, test_project: Project
    ):
        page_id = await self._setup_page(admin_client, test_project.id)
        await admin_client.post(
            f"/api/v1/kb/pages/{page_id}/comments", json={"body": "First"}
        )
        await admin_client.post(
            f"/api/v1/kb/pages/{page_id}/comments", json={"body": "Second"}
        )
        resp = await admin_client.get(f"/api/v1/kb/pages/{page_id}/comments")
        assert resp.status_code == 200
        comments = resp.json()
        assert len(comments) == 2

    async def test_threaded_reply(
        self, admin_client: AsyncClient, test_project: Project
    ):
        page_id = await self._setup_page(admin_client, test_project.id)
        parent = await admin_client.post(
            f"/api/v1/kb/pages/{page_id}/comments", json={"body": "Parent"}
        )
        parent_id = parent.json()["id"]
        await admin_client.post(
            f"/api/v1/kb/pages/{page_id}/comments",
            json={"body": "Reply", "parent_comment_id": parent_id},
        )
        resp = await admin_client.get(f"/api/v1/kb/pages/{page_id}/comments")
        assert resp.status_code == 200
        comments = resp.json()
        assert len(comments) == 1
        assert comments[0]["body"] == "Parent"
        assert len(comments[0]["replies"]) == 1
        assert comments[0]["replies"][0]["body"] == "Reply"

    async def test_nested_replies(
        self, admin_client: AsyncClient, test_project: Project
    ):
        page_id = await self._setup_page(admin_client, test_project.id)
        root = await admin_client.post(
            f"/api/v1/kb/pages/{page_id}/comments", json={"body": "Root"}
        )
        reply = await admin_client.post(
            f"/api/v1/kb/pages/{page_id}/comments",
            json={"body": "Reply 1", "parent_comment_id": root.json()["id"]},
        )
        await admin_client.post(
            f"/api/v1/kb/pages/{page_id}/comments",
            json={"body": "Reply 2", "parent_comment_id": reply.json()["id"]},
        )
        resp = await admin_client.get(f"/api/v1/kb/pages/{page_id}/comments")
        assert resp.status_code == 200
        tree = resp.json()
        assert len(tree) == 1
        assert len(tree[0]["replies"]) == 1
        assert len(tree[0]["replies"][0]["replies"]) == 1

    async def test_delete_comment(
        self, admin_client: AsyncClient, test_project: Project
    ):
        page_id = await self._setup_page(admin_client, test_project.id)
        create = await admin_client.post(
            f"/api/v1/kb/pages/{page_id}/comments", json={"body": "Temp"}
        )
        comment_id = create.json()["id"]
        resp = await admin_client.delete(f"/api/v1/kb/comments/{comment_id}")
        assert resp.status_code == 204

    async def test_deleted_comment_body_redacted(
        self, admin_client: AsyncClient, test_project: Project
    ):
        page_id = await self._setup_page(admin_client, test_project.id)
        create = await admin_client.post(
            f"/api/v1/kb/pages/{page_id}/comments", json={"body": "Secret stuff"}
        )
        comment_id = create.json()["id"]
        await admin_client.delete(f"/api/v1/kb/comments/{comment_id}")
        resp = await admin_client.get(f"/api/v1/kb/pages/{page_id}/comments")
        assert resp.status_code == 200
        bodies = [c["body"] for c in resp.json()]
        assert "Secret stuff" not in bodies

    async def test_invalid_parent_comment(
        self, admin_client: AsyncClient, test_project: Project
    ):
        import uuid

        page_id = await self._setup_page(admin_client, test_project.id)
        resp = await admin_client.post(
            f"/api/v1/kb/pages/{page_id}/comments",
            json={"body": "Orphan", "parent_comment_id": str(uuid.uuid4())},
        )
        assert resp.status_code == 400


# ---------------------------------------------------------------------------
# 5. Templates
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
class TestKBTemplates:
    async def test_list_templates(
        self, admin_client: AsyncClient, test_project: Project
    ):
        resp = await admin_client.get(
            f"/api/v1/projects/{test_project.id}/kb/templates"
        )
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    async def test_create_custom_template(
        self, admin_client: AsyncClient, test_project: Project
    ):
        resp = await admin_client.post(
            f"/api/v1/projects/{test_project.id}/kb/templates",
            json={
                "name": "Sprint Retro",
                "description": "Template for sprint retrospectives",
                "content_markdown": "# Retro\n\n## What went well\n\n## What to improve",
            },
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "Sprint Retro"
        assert data["is_builtin"] is False
        assert data["project_id"] == str(test_project.id)

    async def test_get_template(
        self, admin_client: AsyncClient, test_project: Project
    ):
        create = await admin_client.post(
            f"/api/v1/projects/{test_project.id}/kb/templates",
            json={"name": "Fetchable"},
        )
        template_id = create.json()["id"]
        resp = await admin_client.get(f"/api/v1/kb/templates/{template_id}")
        assert resp.status_code == 200
        assert resp.json()["name"] == "Fetchable"

    async def test_update_template(
        self, admin_client: AsyncClient, test_project: Project
    ):
        create = await admin_client.post(
            f"/api/v1/projects/{test_project.id}/kb/templates",
            json={"name": "Editable"},
        )
        template_id = create.json()["id"]
        resp = await admin_client.patch(
            f"/api/v1/kb/templates/{template_id}",
            json={"name": "Edited Template", "description": "Now with desc"},
        )
        assert resp.status_code == 200
        assert resp.json()["name"] == "Edited Template"
        assert resp.json()["description"] == "Now with desc"

    async def test_delete_custom_template(
        self, admin_client: AsyncClient, test_project: Project
    ):
        create = await admin_client.post(
            f"/api/v1/projects/{test_project.id}/kb/templates",
            json={"name": "Temp Template"},
        )
        template_id = create.json()["id"]
        resp = await admin_client.delete(f"/api/v1/kb/templates/{template_id}")
        assert resp.status_code == 204

    async def test_delete_template_then_404(
        self, admin_client: AsyncClient, test_project: Project
    ):
        create = await admin_client.post(
            f"/api/v1/projects/{test_project.id}/kb/templates",
            json={"name": "Gone"},
        )
        template_id = create.json()["id"]
        await admin_client.delete(f"/api/v1/kb/templates/{template_id}")
        resp = await admin_client.get(f"/api/v1/kb/templates/{template_id}")
        assert resp.status_code == 404

    async def test_template_with_icon(
        self, admin_client: AsyncClient, test_project: Project
    ):
        resp = await admin_client.post(
            f"/api/v1/projects/{test_project.id}/kb/templates",
            json={"name": "Icon Template", "icon": "star"},
        )
        assert resp.status_code == 201
        assert resp.json()["icon"] == "star"


# ---------------------------------------------------------------------------
# 6. Search
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
class TestKBSearch:
    async def test_search_returns_results(
        self, admin_client: AsyncClient, test_project: Project
    ):
        space = await _create_space(
            admin_client, test_project.id, name="Search Space"
        )
        await _create_page(
            admin_client,
            space["id"],
            title="Deployment Guide",
            content_markdown="How to deploy to production with Docker",
        )
        resp = await admin_client.get(
            f"/api/v1/projects/{test_project.id}/kb/search",
            params={"q": "deploy production"},
        )
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    async def test_search_empty_query_fails(
        self, admin_client: AsyncClient, test_project: Project
    ):
        resp = await admin_client.get(
            f"/api/v1/projects/{test_project.id}/kb/search", params={"q": ""}
        )
        assert resp.status_code == 422

    async def test_search_no_query_param_fails(
        self, admin_client: AsyncClient, test_project: Project
    ):
        resp = await admin_client.get(
            f"/api/v1/projects/{test_project.id}/kb/search"
        )
        assert resp.status_code == 422


# ---------------------------------------------------------------------------
# 7. RBAC — member_client (developer) access
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
class TestKBRBAC:
    async def test_member_can_list_spaces(
        self,
        admin_client: AsyncClient,
        member_client: AsyncClient,
        test_project: Project,
    ):
        await _create_space(admin_client, test_project.id, name="Visible")
        resp = await member_client.get(
            f"/api/v1/projects/{test_project.id}/kb/spaces"
        )
        assert resp.status_code == 200
        assert len(resp.json()) >= 1

    async def test_member_can_create_page(
        self,
        admin_client: AsyncClient,
        member_client: AsyncClient,
        test_project: Project,
    ):
        space = await _create_space(admin_client, test_project.id)
        resp = await member_client.post(
            f"/api/v1/kb/spaces/{space['id']}/pages",
            json={"title": "Member Page"},
        )
        assert resp.status_code == 201

    async def test_member_can_read_page(
        self,
        admin_client: AsyncClient,
        member_client: AsyncClient,
        test_project: Project,
    ):
        space = await _create_space(admin_client, test_project.id)
        page = await _create_page(admin_client, space["id"], title="Readable")
        resp = await member_client.get(f"/api/v1/kb/pages/{page['id']}")
        assert resp.status_code == 200

    async def test_member_can_comment(
        self,
        admin_client: AsyncClient,
        member_client: AsyncClient,
        test_project: Project,
    ):
        space = await _create_space(admin_client, test_project.id)
        page = await _create_page(admin_client, space["id"], title="Commentable")
        resp = await member_client.post(
            f"/api/v1/kb/pages/{page['id']}/comments",
            json={"body": "From member"},
        )
        assert resp.status_code == 201
