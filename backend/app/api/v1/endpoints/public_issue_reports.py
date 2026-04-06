from __future__ import annotations

import secrets
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.core import events
from app.schemas.issue_report import IssueReportRead, PublicIssueReportCreate
from app.services import issue_report_service, project_service

router = APIRouter(prefix="/public", tags=["public-issue-reports"])


async def _validate_api_key(
    db: AsyncSession, project_id: UUID, api_key: str,
) -> None:
    project = await project_service.get_project(db, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    stored_key = (project.settings or {}).get("api_key")
    if not stored_key or not secrets.compare_digest(stored_key, api_key):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing API key",
        )


@router.post(
    "/projects/{project_id}/issue-reports",
    response_model=IssueReportRead,
    status_code=status.HTTP_201_CREATED,
)
async def public_create_issue_report(
    project_id: UUID,
    body: PublicIssueReportCreate,
    x_api_key: str = Header(..., alias="X-API-Key"),
    db: AsyncSession = Depends(get_db),
):
    """Create an issue report without user authentication.

    Requires a valid project API key passed via the X-API-Key header.
    Supports anonymous reporters via reporter_name / reporter_email fields.
    """
    await _validate_api_key(db, project_id, x_api_key)

    report = await issue_report_service.create_issue_report(
        db,
        project_id=project_id,
        title=body.title,
        description=body.description,
        priority=body.priority,
        source_url=body.source_url,
        created_by=None,
        reporter_name=body.reporter_name,
        reporter_email=body.reporter_email,
    )

    await db.flush()
    report_full = await issue_report_service.get_issue_report(db, report.id)

    await events.publish(
        events.EVENT_ISSUE_REPORT_CREATED,
        issue_report_id=str(report.id),
        project_id=str(project_id),
        actor_id=None,
    )

    from app.api.v1.endpoints.issue_reports import _enrich_report
    return await _enrich_report(db, report_full)
