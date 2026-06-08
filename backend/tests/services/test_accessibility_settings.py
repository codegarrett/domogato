from __future__ import annotations

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.services.system_settings_service import (
    get_effective_accessibility_settings,
    get_public_accessibility_config,
    update_accessibility_settings,
)


@pytest.mark.asyncio
async def test_accessibility_settings_defaults(db_session: AsyncSession):
    settings = await get_effective_accessibility_settings(db_session)
    assert settings["accessibility_enabled"].value is True
    assert settings["accessibility_keyboard_drag_alternatives"].value is False
    assert settings["accessibility_live_region_verbosity"].value == "minimal"


@pytest.mark.asyncio
async def test_update_accessibility_settings(db_session: AsyncSession, test_user: User):
    result = await update_accessibility_settings(
        db_session,
        {
            "accessibility_board_keyboard_nav": True,
            "accessibility_live_region_verbosity": "verbose",
        },
        updated_by=test_user.id,
    )
    assert result["accessibility_board_keyboard_nav"].value is True
    assert result["accessibility_live_region_verbosity"].value == "verbose"

    public = get_public_accessibility_config(result)
    assert public["accessibility_board_keyboard_nav"] is True


@pytest.mark.asyncio
async def test_invalid_verbosity_raises(db_session: AsyncSession, test_user: User):
    with pytest.raises(ValueError, match="accessibility_live_region_verbosity"):
        await update_accessibility_settings(
            db_session,
            {"accessibility_live_region_verbosity": "invalid"},
            updated_by=test_user.id,
        )
