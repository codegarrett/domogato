from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.core.permissions import OrgRole, ORG_ROLE_HIERARCHY
from app.models.membership import OrgMembership
from app.models.user import User
from app.schemas.common import PaginatedResponse
from app.schemas.workflow import (
    WorkflowCreate,
    WorkflowRead,
    WorkflowStatusCreate,
    WorkflowStatusRead,
    WorkflowStatusUpdate,
    WorkflowTransitionCreate,
    WorkflowTransitionRead,
    WorkflowUpdate,
)
from app.services import organization_service, workflow_service
from app.services import cache_service

router = APIRouter(tags=["workflows"])


async def _invalidate_workflow_cache(workflow_id: UUID, org_id: UUID) -> None:
    await cache_service.invalidate(f"workflow:{workflow_id}")
    await cache_service.invalidate_pattern(f"workflows:org:{org_id}:*")


async def _get_org_membership(
    db: AsyncSession, org_id: UUID, user: User,
) -> OrgMembership:
    if user.is_system_admin:
        return OrgMembership(
            user_id=user.id,
            organization_id=org_id,
            role=OrgRole.OWNER.value,
        )
    membership = await organization_service.get_member(db, org_id, user.id)
    if membership is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not a member of this organization",
        )
    return membership


def _check_min_role(membership: OrgMembership, minimum: OrgRole) -> None:
    if ORG_ROLE_HIERARCHY[OrgRole(membership.role)] < ORG_ROLE_HIERARCHY[minimum]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Requires {minimum.value} role or higher",
        )


async def _get_workflow_or_404(db: AsyncSession, workflow_id: UUID):
    wf = await workflow_service.get_workflow(db, workflow_id)
    if wf is None:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return wf


# ── Org-scoped endpoints ──────────────────────────────────────────


@router.get(
    "/organizations/{org_id}/workflows",
    response_model=PaginatedResponse[WorkflowRead],
)
async def list_workflows(
    org_id: UUID,
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    include_templates: bool = Query(False),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_org_membership(db, org_id, user)
    cache_key = f"workflows:org:{org_id}:o:{offset}:l:{limit}:t:{include_templates}"

    async def _load():
        workflows, total = await workflow_service.list_workflows(
            db, org_id, offset=offset, limit=limit, include_templates=include_templates,
        )
        resp = PaginatedResponse(
            items=[WorkflowRead.model_validate(w) for w in workflows],
            total=total,
            offset=offset,
            limit=limit,
        )
        return resp.model_dump()

    return await cache_service.get_cached(cache_key, _load, ttl=300)


@router.post(
    "/organizations/{org_id}/workflows",
    response_model=WorkflowRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_workflow(
    org_id: UUID,
    body: WorkflowCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    membership = await _get_org_membership(db, org_id, user)
    _check_min_role(membership, OrgRole.ADMIN)

    if body.template_id is not None:
        try:
            wf = await workflow_service.clone_from_template(
                db, org_id, body.template_id, body.name,
            )
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail=str(exc),
            )
    else:
        wf = await workflow_service.create_workflow(
            db, org_id, body.name, body.description,
        )
        wf = await workflow_service.get_workflow(db, wf.id)  # type: ignore[arg-type]

    await cache_service.invalidate_pattern(f"workflows:org:{org_id}:*")
    return wf


@router.post(
    "/organizations/{org_id}/workflows/seed",
    response_model=list[WorkflowRead],
    status_code=status.HTTP_201_CREATED,
)
async def seed_default_workflows(
    org_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    membership = await _get_org_membership(db, org_id, user)
    _check_min_role(membership, OrgRole.ADMIN)

    workflows = await workflow_service.seed_default_workflows(db, org_id)
    reloaded = []
    for wf in workflows:
        loaded = await workflow_service.get_workflow(db, wf.id)
        reloaded.append(loaded)
    await cache_service.invalidate_pattern(f"workflows:org:{org_id}:*")
    return reloaded


# ── Workflow-scoped endpoints ──────────────────────────────────────


@router.get("/workflows/{workflow_id}", response_model=WorkflowRead)
async def get_workflow(
    workflow_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    wf = await _get_workflow_or_404(db, workflow_id)
    await _get_org_membership(db, wf.organization_id, user)

    cache_key = f"workflow:{workflow_id}"

    async def _load():
        return WorkflowRead.model_validate(wf).model_dump()

    return await cache_service.get_cached(cache_key, _load, ttl=300)


@router.patch("/workflows/{workflow_id}", response_model=WorkflowRead)
async def update_workflow(
    workflow_id: UUID,
    body: WorkflowUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    wf = await _get_workflow_or_404(db, workflow_id)
    membership = await _get_org_membership(db, wf.organization_id, user)
    _check_min_role(membership, OrgRole.ADMIN)

    update_data = body.model_dump(exclude_unset=True)
    updated = await workflow_service.update_workflow(db, workflow_id, **update_data)
    if updated is None:
        raise HTTPException(status_code=404, detail="Workflow not found")
    await _invalidate_workflow_cache(workflow_id, wf.organization_id)
    return await workflow_service.get_workflow(db, workflow_id)


@router.delete("/workflows/{workflow_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workflow(
    workflow_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    wf = await _get_workflow_or_404(db, workflow_id)
    membership = await _get_org_membership(db, wf.organization_id, user)
    _check_min_role(membership, OrgRole.ADMIN)

    org_id = wf.organization_id
    deleted = await workflow_service.delete_workflow(db, workflow_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Workflow not found")
    await _invalidate_workflow_cache(workflow_id, org_id)


# ── Status endpoints ───────────────────────────────────────────────


@router.post(
    "/workflows/{workflow_id}/statuses",
    response_model=WorkflowStatusRead,
    status_code=status.HTTP_201_CREATED,
)
async def add_status(
    workflow_id: UUID,
    body: WorkflowStatusCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    wf = await _get_workflow_or_404(db, workflow_id)
    membership = await _get_org_membership(db, wf.organization_id, user)
    _check_min_role(membership, OrgRole.ADMIN)

    ws = await workflow_service.add_status(
        db,
        workflow_id,
        name=body.name,
        category=body.category,
        color=body.color,
        position=body.position,
        is_initial=body.is_initial,
        is_terminal=body.is_terminal,
    )
    await _invalidate_workflow_cache(workflow_id, wf.organization_id)
    return ws


@router.patch("/workflows/statuses/{status_id}", response_model=WorkflowStatusRead)
async def update_status(
    status_id: UUID,
    body: WorkflowStatusUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import select
    from app.models.workflow import WorkflowStatus

    result = await db.execute(
        select(WorkflowStatus).where(WorkflowStatus.id == status_id)
    )
    ws = result.scalar_one_or_none()
    if ws is None:
        raise HTTPException(status_code=404, detail="Status not found")

    wf = await _get_workflow_or_404(db, ws.workflow_id)
    membership = await _get_org_membership(db, wf.organization_id, user)
    _check_min_role(membership, OrgRole.ADMIN)

    update_data = body.model_dump(exclude_unset=True)
    updated = await workflow_service.update_status(db, status_id, **update_data)
    if updated is None:
        raise HTTPException(status_code=404, detail="Status not found")
    await _invalidate_workflow_cache(ws.workflow_id, wf.organization_id)
    return updated


@router.delete(
    "/workflows/statuses/{status_id}", status_code=status.HTTP_204_NO_CONTENT,
)
async def remove_status(
    status_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import select
    from app.models.workflow import WorkflowStatus

    result = await db.execute(
        select(WorkflowStatus).where(WorkflowStatus.id == status_id)
    )
    ws = result.scalar_one_or_none()
    if ws is None:
        raise HTTPException(status_code=404, detail="Status not found")

    wf = await _get_workflow_or_404(db, ws.workflow_id)
    membership = await _get_org_membership(db, wf.organization_id, user)
    _check_min_role(membership, OrgRole.ADMIN)

    removed = await workflow_service.remove_status(db, status_id)
    if not removed:
        raise HTTPException(status_code=404, detail="Status not found")
    await _invalidate_workflow_cache(ws.workflow_id, wf.organization_id)


# ── Transition endpoints ──────────────────────────────────────────


@router.post(
    "/workflows/{workflow_id}/transitions",
    response_model=WorkflowTransitionRead,
    status_code=status.HTTP_201_CREATED,
)
async def add_transition(
    workflow_id: UUID,
    body: WorkflowTransitionCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    wf = await _get_workflow_or_404(db, workflow_id)
    membership = await _get_org_membership(db, wf.organization_id, user)
    _check_min_role(membership, OrgRole.ADMIN)

    t = await workflow_service.add_transition(
        db,
        workflow_id,
        from_status_id=body.from_status_id,
        to_status_id=body.to_status_id,
        name=body.name,
        conditions=body.conditions,
    )
    await _invalidate_workflow_cache(workflow_id, wf.organization_id)
    return t


@router.delete(
    "/workflows/transitions/{transition_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def remove_transition(
    transition_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import select
    from app.models.workflow import WorkflowTransition

    result = await db.execute(
        select(WorkflowTransition).where(WorkflowTransition.id == transition_id)
    )
    t = result.scalar_one_or_none()
    if t is None:
        raise HTTPException(status_code=404, detail="Transition not found")

    wf = await _get_workflow_or_404(db, t.workflow_id)
    membership = await _get_org_membership(db, wf.organization_id, user)
    _check_min_role(membership, OrgRole.ADMIN)

    removed = await workflow_service.remove_transition(db, transition_id)
    if not removed:
        raise HTTPException(status_code=404, detail="Transition not found")
    await _invalidate_workflow_cache(t.workflow_id, wf.organization_id)


# ── Validation ─────────────────────────────────────────────────────


@router.get("/workflows/{workflow_id}/validate")
async def validate_workflow(
    workflow_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    wf = await _get_workflow_or_404(db, workflow_id)
    await _get_org_membership(db, wf.organization_id, user)

    errors = await workflow_service.validate_workflow(db, workflow_id)
    return {"valid": len(errors) == 0, "errors": errors}
