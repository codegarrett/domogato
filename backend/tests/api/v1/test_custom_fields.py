from __future__ import annotations

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Organization, Project
from app.models.user import User


pytestmark = pytest.mark.asyncio


class TestCustomFieldDefinitions:
    """Tests for custom field definition CRUD."""

    async def test_create_text_field(self, admin_client: AsyncClient, test_project: Project):
        resp = await admin_client.post(
            f"/api/v1/projects/{test_project.id}/custom-fields",
            json={
                "name": "Story Points",
                "field_type": "text",
                "description": "Estimated effort",
            },
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "Story Points"
        assert data["field_type"] == "text"
        assert data["is_required"] is False
        assert data["is_active"] is True
        assert data["options"] == []

    async def test_create_select_field_with_options(
        self, admin_client: AsyncClient, test_project: Project
    ):
        resp = await admin_client.post(
            f"/api/v1/projects/{test_project.id}/custom-fields",
            json={
                "name": "Severity",
                "field_type": "select",
                "options": [
                    {"label": "Low", "color": "#22c55e"},
                    {"label": "Medium", "color": "#f59e0b"},
                    {"label": "High", "color": "#ef4444"},
                ],
            },
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["field_type"] == "select"
        assert len(data["options"]) == 3
        assert data["options"][0]["label"] == "Low"
        assert data["options"][0]["color"] == "#22c55e"

    async def test_create_field_invalid_type(
        self, admin_client: AsyncClient, test_project: Project
    ):
        resp = await admin_client.post(
            f"/api/v1/projects/{test_project.id}/custom-fields",
            json={"name": "Bad", "field_type": "unknown"},
        )
        assert resp.status_code == 422

    async def test_list_definitions(self, admin_client: AsyncClient, test_project: Project):
        await admin_client.post(
            f"/api/v1/projects/{test_project.id}/custom-fields",
            json={"name": "Field A", "field_type": "text"},
        )
        await admin_client.post(
            f"/api/v1/projects/{test_project.id}/custom-fields",
            json={"name": "Field B", "field_type": "number"},
        )

        resp = await admin_client.get(
            f"/api/v1/projects/{test_project.id}/custom-fields"
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) >= 2
        names = [d["name"] for d in data]
        assert "Field A" in names
        assert "Field B" in names

    async def test_update_definition(self, admin_client: AsyncClient, test_project: Project):
        create_resp = await admin_client.post(
            f"/api/v1/projects/{test_project.id}/custom-fields",
            json={"name": "Original", "field_type": "text"},
        )
        field_id = create_resp.json()["id"]

        resp = await admin_client.patch(
            f"/api/v1/custom-fields/{field_id}",
            json={"name": "Updated", "is_required": True},
        )
        assert resp.status_code == 200
        assert resp.json()["name"] == "Updated"
        assert resp.json()["is_required"] is True

    async def test_delete_definition(self, admin_client: AsyncClient, test_project: Project):
        create_resp = await admin_client.post(
            f"/api/v1/projects/{test_project.id}/custom-fields",
            json={"name": "ToDelete", "field_type": "checkbox"},
        )
        field_id = create_resp.json()["id"]

        resp = await admin_client.delete(f"/api/v1/custom-fields/{field_id}")
        assert resp.status_code == 204

        list_resp = await admin_client.get(
            f"/api/v1/projects/{test_project.id}/custom-fields"
        )
        ids = [d["id"] for d in list_resp.json()]
        assert field_id not in ids

    async def test_reorder_fields(self, admin_client: AsyncClient, test_project: Project):
        r1 = await admin_client.post(
            f"/api/v1/projects/{test_project.id}/custom-fields",
            json={"name": "First", "field_type": "text"},
        )
        r2 = await admin_client.post(
            f"/api/v1/projects/{test_project.id}/custom-fields",
            json={"name": "Second", "field_type": "text"},
        )
        id1 = r1.json()["id"]
        id2 = r2.json()["id"]

        resp = await admin_client.put(
            f"/api/v1/projects/{test_project.id}/custom-fields/reorder",
            json=[id2, id1],
        )
        assert resp.status_code == 200
        result = resp.json()
        assert result[0]["id"] == id2
        assert result[1]["id"] == id1


class TestCustomFieldOptions:
    """Tests for field options management."""

    async def test_add_option(self, admin_client: AsyncClient, test_project: Project):
        create_resp = await admin_client.post(
            f"/api/v1/projects/{test_project.id}/custom-fields",
            json={"name": "Status", "field_type": "select"},
        )
        field_id = create_resp.json()["id"]

        resp = await admin_client.post(
            f"/api/v1/custom-fields/{field_id}/options",
            json={"label": "Active", "color": "#10b981"},
        )
        assert resp.status_code == 201
        assert resp.json()["label"] == "Active"

    async def test_add_option_to_non_select_field(
        self, admin_client: AsyncClient, test_project: Project
    ):
        create_resp = await admin_client.post(
            f"/api/v1/projects/{test_project.id}/custom-fields",
            json={"name": "Points", "field_type": "number"},
        )
        field_id = create_resp.json()["id"]

        resp = await admin_client.post(
            f"/api/v1/custom-fields/{field_id}/options",
            json={"label": "Invalid"},
        )
        assert resp.status_code == 400

    async def test_remove_option(self, admin_client: AsyncClient, test_project: Project):
        create_resp = await admin_client.post(
            f"/api/v1/projects/{test_project.id}/custom-fields",
            json={
                "name": "Priority",
                "field_type": "select",
                "options": [{"label": "Low"}, {"label": "High"}],
            },
        )
        option_id = create_resp.json()["options"][0]["id"]

        resp = await admin_client.delete(f"/api/v1/custom-fields/options/{option_id}")
        assert resp.status_code == 204


class TestCustomFieldValidation:
    """Tests for value validation logic."""

    async def test_validate_required_field(
        self, admin_client: AsyncClient, test_project: Project, db_session: AsyncSession
    ):
        from app.services import custom_field_service

        defn = await custom_field_service.create_field_definition(
            db_session,
            project_id=test_project.id,
            name="Required Text",
            field_type="text",
            is_required=True,
        )

        errors = await custom_field_service.validate_field_values(
            db_session, test_project.id, {}
        )
        assert any("Required Text" in e and "required" in e for e in errors)

        errors = await custom_field_service.validate_field_values(
            db_session, test_project.id, {str(defn.id): "some value"}
        )
        assert len(errors) == 0

    async def test_validate_number_min_max(self, db_session: AsyncSession, test_project: Project):
        from app.services import custom_field_service

        defn = await custom_field_service.create_field_definition(
            db_session,
            project_id=test_project.id,
            name="Effort",
            field_type="number",
            validation_rules={"min": 1, "max": 100},
        )
        fid = str(defn.id)

        errors = await custom_field_service.validate_field_values(
            db_session, test_project.id, {fid: 0}
        )
        assert len(errors) == 1

        errors = await custom_field_service.validate_field_values(
            db_session, test_project.id, {fid: 50}
        )
        assert len(errors) == 0

    async def test_validate_select_option(self, db_session: AsyncSession, test_project: Project):
        from app.services import custom_field_service

        defn = await custom_field_service.create_field_definition(
            db_session,
            project_id=test_project.id,
            name="Size",
            field_type="select",
            options=[{"label": "Small"}, {"label": "Large"}],
        )
        fid = str(defn.id)
        valid_opt_id = str(defn.options[0].id)

        errors = await custom_field_service.validate_field_values(
            db_session, test_project.id, {fid: valid_opt_id}
        )
        assert len(errors) == 0

        errors = await custom_field_service.validate_field_values(
            db_session, test_project.id, {fid: "bogus-id"}
        )
        assert len(errors) == 1

    async def test_validate_checkbox(self, db_session: AsyncSession, test_project: Project):
        from app.services import custom_field_service

        defn = await custom_field_service.create_field_definition(
            db_session,
            project_id=test_project.id,
            name="Reviewed",
            field_type="checkbox",
        )
        fid = str(defn.id)

        errors = await custom_field_service.validate_field_values(
            db_session, test_project.id, {fid: True}
        )
        assert len(errors) == 0

        errors = await custom_field_service.validate_field_values(
            db_session, test_project.id, {fid: "yes"}
        )
        assert len(errors) == 1

    async def test_validate_url(self, db_session: AsyncSession, test_project: Project):
        from app.services import custom_field_service

        defn = await custom_field_service.create_field_definition(
            db_session,
            project_id=test_project.id,
            name="Link",
            field_type="url",
        )
        fid = str(defn.id)

        errors = await custom_field_service.validate_field_values(
            db_session, test_project.id, {fid: "https://example.com"}
        )
        assert len(errors) == 0

        errors = await custom_field_service.validate_field_values(
            db_session, test_project.id, {fid: "not-a-url"}
        )
        assert len(errors) == 1
