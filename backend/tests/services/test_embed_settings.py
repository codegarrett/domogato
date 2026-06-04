from __future__ import annotations

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.services.system_settings_service import (
    get_effective_embed_settings,
    update_embed_settings,
)


@pytest.mark.asyncio
async def test_embed_settings_defaults(db_session: AsyncSession):
    settings = await get_effective_embed_settings(db_session)
    assert settings["external_agent_enabled"].value is False
    assert settings["external_agent_allowed_origins"].value == []


@pytest.mark.asyncio
async def test_update_embed_settings(db_session: AsyncSession, test_user: User):
    result = await update_embed_settings(
        db_session,
        {
            "external_agent_enabled": True,
            "external_agent_allowed_origins": ["https://example.com"],
        },
        updated_by=test_user.id,
    )
    assert result["external_agent_enabled"].value is True
    assert result["external_agent_allowed_origins"].value == ["https://example.com"]

    effective = await get_effective_embed_settings(db_session)
    assert effective["external_agent_enabled"].value is True
    assert "https://example.com" in effective["external_agent_allowed_origins"].value
