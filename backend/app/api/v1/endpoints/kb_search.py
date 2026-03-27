from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.core.permissions import ProjectRole, require_project_role
from app.models.kb_page import KBPage
from app.models.kb_space import KBSpace
from app.models.user import User
from app.schemas.kb import PageRead

router = APIRouter(tags=["knowledge-base"])


class KBSearchResult(PageRead):
    space_name: str = ""
    space_slug: str = ""
    headline: str = ""


@router.get(
    "/projects/{project_id}/kb/search",
    response_model=list[KBSearchResult],
)
async def search_kb(
    project_id: UUID,
    q: str = Query(..., min_length=1, max_length=200),
    space_id: UUID | None = Query(None),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    _role: ProjectRole = require_project_role(ProjectRole.GUEST),
    db: AsyncSession = Depends(get_db),
):
    ts_query = func.plainto_tsquery("english", q)

    base = (
        select(
            KBPage,
            KBSpace.name.label("space_name"),
            KBSpace.slug.label("space_slug"),
            func.ts_headline(
                "english",
                KBPage.content_markdown,
                ts_query,
                "MaxFragments=2, MaxWords=40, MinWords=15",
            ).label("headline"),
        )
        .join(KBSpace, KBSpace.id == KBPage.space_id)
        .where(
            KBSpace.project_id == project_id,
            KBPage.is_deleted == False,
            KBPage.is_published == True,
            KBPage.search_vector.op("@@")(ts_query),
        )
    )

    if space_id is not None:
        base = base.where(KBPage.space_id == space_id)

    ranked = base.order_by(
        func.ts_rank_cd(KBPage.search_vector, ts_query).desc(),
    ).offset(offset).limit(limit)

    rows = (await db.execute(ranked)).all()

    results = []
    for page, s_name, s_slug, headline in rows:
        read = KBSearchResult.model_validate(page)
        read.space_name = s_name
        read.space_slug = s_slug
        read.headline = headline or ""
        results.append(read)

    return results
