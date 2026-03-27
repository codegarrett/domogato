from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.core.permissions import (
    PROJECT_ROLE_HIERARCHY,
    ProjectRole,
    resolve_effective_project_role,
)
from app.models.user import User
from app.schemas.import_tickets import (
    ImportAnalyzeRequest,
    ImportAnalyzeResponse,
    ImportExecuteRequest,
    ImportResult,
)
from app.services import import_service, project_service

router = APIRouter(tags=["import"])


async def _require_maintainer(
    db: AsyncSession, project_id: UUID, user: User,
) -> None:
    if user.is_system_admin:
        return
    project = await project_service.get_project(db, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    effective = await resolve_effective_project_role(
        user_id=user.id,
        project_id=project_id,
        organization_id=project.organization_id,
        project_visibility=project.visibility,
        is_system_admin=user.is_system_admin,
        db=db,
    )
    if effective is None or PROJECT_ROLE_HIERARCHY[effective] < PROJECT_ROLE_HIERARCHY[ProjectRole.MAINTAINER]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")


@router.post(
    "/projects/{project_id}/import/analyze",
    response_model=ImportAnalyzeResponse,
)
async def analyze_import(
    project_id: UUID,
    body: ImportAnalyzeRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_maintainer(db, project_id, user)

    try:
        result = await import_service.analyze_import(
            content=body.content,
            fmt=body.format,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    return result


@router.post(
    "/projects/{project_id}/import/execute",
    response_model=ImportResult,
)
async def execute_import(
    project_id: UUID,
    body: ImportExecuteRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_maintainer(db, project_id, user)

    try:
        result = await import_service.execute_import(
            db=db,
            project_id=project_id,
            reporter_id=user.id,
            import_session_id=body.import_session_id,
            column_mappings=[cm.model_dump() for cm in body.column_mappings],
            value_mappings={
                field: [vm.model_dump() for vm in vms]
                for field, vms in body.value_mappings.items()
            },
            options=body.options.model_dump(),
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    return result
