from __future__ import annotations

from typing import Any

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.core.permissions import require_system_admin
from app.models.user import User
from app.services.system_settings_service import (
    get_effective_auth_settings,
    update_auth_settings,
)

router = APIRouter(prefix="/system-settings", tags=["system_settings"])


class AuthSettingResponse(BaseModel):
    value: Any
    source: str
    env_locked: bool


class AuthSettingsResponse(BaseModel):
    settings: dict[str, AuthSettingResponse]


class AuthSettingsUpdate(BaseModel):
    auth_mode: str | None = None
    local_registration_enabled: bool | None = None
    oidc_issuer_url: str | None = None
    oidc_client_id: str | None = None
    oidc_client_secret: str | None = None
    oidc_auto_provision: bool | None = None
    oidc_allowed_domains: list[str] | None = None
    oidc_default_org_id: str | None = None
    oidc_admin_claim: str | None = None


class TestOidcRequest(BaseModel):
    issuer_url: str | None = None


class TestOidcResponse(BaseModel):
    success: bool
    issuer: str | None = None
    authorization_endpoint: str | None = None
    token_endpoint: str | None = None
    detail: str | None = None


def _format_settings(settings_dict: dict) -> AuthSettingsResponse:
    formatted = {}
    for key, sv in settings_dict.items():
        val = sv.value
        if key == "oidc_client_secret" and val:
            val = "****"
        formatted[key] = AuthSettingResponse(
            value=val, source=sv.source, env_locked=sv.env_locked
        )
    return AuthSettingsResponse(settings=formatted)


@router.get("/auth", response_model=AuthSettingsResponse)
async def get_auth_settings(
    admin: User = require_system_admin(),
    db: AsyncSession = Depends(get_db),
):
    """Get effective auth settings with source annotations."""
    result = await get_effective_auth_settings(db)
    return _format_settings(result)


@router.put("/auth", response_model=AuthSettingsResponse)
async def put_auth_settings(
    body: AuthSettingsUpdate,
    admin: User = require_system_admin(),
    db: AsyncSession = Depends(get_db),
):
    """Update auth settings. Env-locked fields cannot be changed."""
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        result = await get_effective_auth_settings(db)
        return _format_settings(result)

    if "auth_mode" in updates and updates["auth_mode"] not in ("local", "oidc"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="auth_mode must be 'local' or 'oidc'",
        )

    try:
        result = await update_auth_settings(db, updates, updated_by=admin.id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    return _format_settings(result)


@router.post("/auth/test-oidc", response_model=TestOidcResponse)
async def test_oidc_connection(
    body: TestOidcRequest | None = None,
    admin: User = require_system_admin(),
    db: AsyncSession = Depends(get_db),
):
    """Test OIDC provider connectivity by fetching the discovery document."""
    effective = await get_effective_auth_settings(db)
    issuer_url = (body.issuer_url if body and body.issuer_url else None) or effective["oidc_issuer_url"].value

    if not issuer_url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No OIDC issuer URL configured or provided",
        )

    discovery_url = f"{issuer_url.rstrip('/')}/.well-known/openid-configuration"
    try:
        async with httpx.AsyncClient(verify=False, timeout=10.0) as client:
            resp = await client.get(discovery_url)
            resp.raise_for_status()
            data = resp.json()
            return TestOidcResponse(
                success=True,
                issuer=data.get("issuer"),
                authorization_endpoint=data.get("authorization_endpoint"),
                token_endpoint=data.get("token_endpoint"),
            )
    except Exception as e:
        return TestOidcResponse(success=False, detail=str(e))
