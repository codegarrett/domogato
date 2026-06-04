"""Tests for admin manual embedding document endpoints."""
from __future__ import annotations

from io import BytesIO
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.project import Project
from app.services.embedding_category_service import ensure_system_categories


@pytest.mark.asyncio
async def test_list_categories(admin_client: AsyncClient, test_project: Project, db: AsyncSession):
    await ensure_system_categories(db, test_project.id)
    await db.flush()

    resp = await admin_client.get(
        "/api/v1/admin/embeddings/categories",
        params={"project_id": str(test_project.id)},
    )
    assert resp.status_code == 200
    data = resp.json()
    slugs = {c["slug"] for c in data}
    assert "knowledge_base" in slugs
    assert "documents" in slugs


@pytest.mark.asyncio
async def test_create_custom_category(admin_client: AsyncClient, test_project: Project, db: AsyncSession):
    await ensure_system_categories(db, test_project.id)
    await db.flush()

    resp = await admin_client.post(
        "/api/v1/admin/embeddings/categories",
        json={
            "project_id": str(test_project.id),
            "slug": "runbooks",
            "name": "Runbooks",
        },
    )
    assert resp.status_code == 201
    assert resp.json()["slug"] == "runbooks"


@pytest.mark.asyncio
async def test_upload_embedding_document(
    admin_client: AsyncClient,
    test_project: Project,
    db: AsyncSession,
):
    cats = await ensure_system_categories(db, test_project.id)
    await db.flush()
    docs_cat = cats["documents"]

    with patch(
        "app.services.storage_service.put_object",
        new=AsyncMock(),
    ), patch(
        "app.tasks.embedding_tasks.schedule_embedding_document"
    ) as mock_schedule:
        resp = await admin_client.post(
            "/api/v1/admin/embeddings/documents",
            data={
                "project_id": str(test_project.id),
                "category_id": str(docs_cat.id),
                "title": "Test Doc",
            },
            files={"file": ("notes.txt", BytesIO(b"hello world"), "text/plain")},
        )

    assert resp.status_code == 201
    body = resp.json()
    assert body["title"] == "Test Doc"
    assert body["filename"] == "notes.txt"
    mock_schedule.assert_called_once()


@pytest.mark.asyncio
async def test_list_and_delete_document(
    admin_client: AsyncClient,
    test_project: Project,
    db: AsyncSession,
):
    cats = await ensure_system_categories(db, test_project.id)
    await db.flush()

    with patch(
        "app.services.storage_service.put_object",
        new=AsyncMock(),
    ), patch(
        "app.tasks.embedding_tasks.schedule_embedding_document"
    ):
        upload = await admin_client.post(
            "/api/v1/admin/embeddings/documents",
            data={
                "project_id": str(test_project.id),
                "category_id": str(cats["documents"].id),
            },
            files={"file": ("notes.txt", BytesIO(b"hello world"), "text/plain")},
        )
    doc_id = upload.json()["id"]

    list_resp = await admin_client.get(
        "/api/v1/admin/embeddings/documents",
        params={"project_id": str(test_project.id)},
    )
    assert list_resp.status_code == 200
    assert list_resp.json()["total"] == 1

    with patch(
        "app.services.storage_service.delete_object",
        new=AsyncMock(),
    ):
        del_resp = await admin_client.delete(f"/api/v1/admin/embeddings/documents/{doc_id}")
    assert del_resp.status_code == 200
