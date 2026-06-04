"""Tests for admin embedding management endpoints."""
from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ai_embedding import AIEmbedding
from app.models.kb_page import KBPage
from app.models.kb_space import KBSpace
from app.models.project import Project
from app.models.organization import Organization

DUMMY_VECTOR = [0.0] * 1536


async def _seed_embedding(
    db: AsyncSession,
    *,
    project: Project,
    content_type: str = "kb_page",
    content_id: uuid.UUID | None = None,
    chunk_index: int = 0,
    chunk_text: str = "Sample chunk text about authentication",
    metadata: dict | None = None,
) -> AIEmbedding:
    embedding = AIEmbedding(
        project_id=project.id,
        content_type=content_type,
        content_id=content_id or uuid.uuid4(),
        chunk_index=chunk_index,
        chunk_text=chunk_text,
        embedding=DUMMY_VECTOR,
        metadata_=metadata or {"page_title": "Auth Guide", "space_name": "Docs"},
    )
    db.add(embedding)
    await db.flush()
    return embedding


class TestAdminEmbeddingsAuth:
    @pytest.mark.asyncio
    async def test_non_admin_cannot_access_stats(self, client: AsyncClient):
        resp = await client.get("/api/v1/admin/embeddings/stats")
        assert resp.status_code == 403

    @pytest.mark.asyncio
    async def test_non_admin_cannot_list(self, client: AsyncClient):
        resp = await client.get("/api/v1/admin/embeddings")
        assert resp.status_code == 403


class TestAdminEmbeddingsStatsAndList:
    @pytest.mark.asyncio
    async def test_stats_and_list(
        self,
        admin_client: AsyncClient,
        db: AsyncSession,
        test_project: Project,
    ):
        content_id = uuid.uuid4()
        await _seed_embedding(db, project=test_project, content_id=content_id)
        await _seed_embedding(
            db,
            project=test_project,
            content_id=content_id,
            chunk_index=1,
            chunk_text="Second chunk",
        )
        await db.flush()

        stats_resp = await admin_client.get("/api/v1/admin/embeddings/stats")
        assert stats_resp.status_code == 200
        stats = stats_resp.json()
        assert stats["total_chunks"] == 2
        assert stats["unique_sources"] == 1
        assert stats["by_content_type"]["kb_page"] == 2
        assert len(stats["by_project"]) == 1
        assert stats["by_project"][0]["project_name"] == test_project.name

        list_resp = await admin_client.get("/api/v1/admin/embeddings")
        assert list_resp.status_code == 200
        data = list_resp.json()
        assert data["total"] == 2
        assert len(data["items"]) == 2
        assert "chunk_text_preview" in data["items"][0]
        assert "embedding" not in data["items"][0]

    @pytest.mark.asyncio
    async def test_list_filters(
        self,
        admin_client: AsyncClient,
        db: AsyncSession,
        test_project: Project,
        test_org: Organization,
    ):
        other_project = Project(
            organization_id=test_org.id,
            name="Other",
            key="OTH",
            visibility="internal",
        )
        db.add(other_project)
        await db.flush()

        await _seed_embedding(db, project=test_project, chunk_text="Alpha content")
        await _seed_embedding(
            db,
            project=other_project,
            content_type="kb_attachment",
            chunk_text="Beta attachment",
            metadata={"filename": "report.pdf"},
        )
        await db.flush()

        by_project = await admin_client.get(
            "/api/v1/admin/embeddings",
            params={"project_id": str(test_project.id)},
        )
        assert by_project.json()["total"] == 1

        by_type = await admin_client.get(
            "/api/v1/admin/embeddings",
            params={"content_type": "kb_attachment"},
        )
        assert by_type.json()["total"] == 1

        by_search = await admin_client.get(
            "/api/v1/admin/embeddings",
            params={"q": "Alpha"},
        )
        assert by_search.json()["total"] == 1

    @pytest.mark.asyncio
    async def test_get_detail_and_delete(
        self,
        admin_client: AsyncClient,
        db: AsyncSession,
        test_project: Project,
    ):
        embedding = await _seed_embedding(db, project=test_project)
        await db.flush()

        detail_resp = await admin_client.get(f"/api/v1/admin/embeddings/{embedding.id}")
        assert detail_resp.status_code == 200
        detail = detail_resp.json()
        assert detail["chunk_text"] == embedding.chunk_text
        assert detail["project_name"] == test_project.name

        delete_resp = await admin_client.delete(f"/api/v1/admin/embeddings/{embedding.id}")
        assert delete_resp.status_code == 200
        assert delete_resp.json()["deleted"] == 1

        missing = await admin_client.get(f"/api/v1/admin/embeddings/{embedding.id}")
        assert missing.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_by_content(
        self,
        admin_client: AsyncClient,
        db: AsyncSession,
        test_project: Project,
    ):
        content_id = uuid.uuid4()
        for i in range(3):
            await _seed_embedding(
                db,
                project=test_project,
                content_id=content_id,
                chunk_index=i,
            )
        await db.flush()

        resp = await admin_client.request(
            "DELETE",
            "/api/v1/admin/embeddings/content",
            json={"content_type": "kb_page", "content_id": str(content_id)},
        )
        assert resp.status_code == 200
        assert resp.json()["deleted"] == 3

        list_resp = await admin_client.get("/api/v1/admin/embeddings")
        assert list_resp.json()["total"] == 0


class TestAdminEmbeddingsSemanticSearch:
    @pytest.mark.asyncio
    async def test_semantic_search(
        self,
        admin_client: AsyncClient,
        test_project: Project,
    ):
        mock_results = [
            {
                "id": str(uuid.uuid4()),
                "content_type": "kb_page",
                "content_id": str(uuid.uuid4()),
                "chunk_index": 0,
                "chunk_text": "Matching chunk",
                "metadata": {"page_title": "Guide"},
                "similarity": 0.92,
            }
        ]

        with patch(
            "app.services.embedding_admin_service.is_embedding_configured",
            return_value=True,
        ), patch(
            "app.services.embedding_admin_service.vector_search",
            new=AsyncMock(return_value=mock_results),
        ):
            resp = await admin_client.post(
                "/api/v1/admin/embeddings/semantic-search",
                json={
                    "query": "how to authenticate",
                    "project_id": str(test_project.id),
                    "limit": 5,
                },
            )

        assert resp.status_code == 200
        data = resp.json()
        assert data["query"] == "how to authenticate"
        assert len(data["results"]) == 1
        assert data["results"][0]["similarity"] == 0.92


class TestAdminEmbeddingsReindex:
    @pytest.mark.asyncio
    async def test_reindex_project_queues_tasks(
        self,
        admin_client: AsyncClient,
        db: AsyncSession,
        test_project: Project,
    ):
        space = KBSpace(
            project_id=test_project.id,
            name="Docs",
            slug="docs",
        )
        db.add(space)
        await db.flush()

        page = KBPage(
            space_id=space.id,
            title="Page",
            slug="page",
            content_markdown="# Hello world",
        )
        db.add(page)
        await db.flush()

        with patch(
            "app.services.embedding_admin_service.is_embedding_configured",
            return_value=True,
        ), patch(
            "app.tasks.embedding_tasks.reindex_project_embeddings"
        ) as mock_task:
            mock_task.delay = MagicMock()
            resp = await admin_client.post(
                f"/api/v1/admin/embeddings/projects/{test_project.id}/reindex"
            )

        assert resp.status_code == 200
        data = resp.json()
        assert data["pages_queued"] == 1
        assert data["attachments_queued"] == 0
        mock_task.delay.assert_called_once_with(str(test_project.id))

    @pytest.mark.asyncio
    async def test_reindex_content_kb_page(
        self,
        admin_client: AsyncClient,
    ):
        page_id = uuid.uuid4()

        with patch(
            "app.services.embedding_admin_service.is_embedding_configured",
            return_value=True,
        ), patch(
            "app.tasks.embedding_tasks.schedule_kb_page_embedding"
        ) as mock_schedule:
            resp = await admin_client.post(
                f"/api/v1/admin/embeddings/content/kb_page/{page_id}/reindex"
            )

        assert resp.status_code == 200
        assert resp.json()["pages_queued"] == 1
        mock_schedule.assert_called_once_with(str(page_id))
