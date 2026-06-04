from __future__ import annotations

import pytest

from app.models.user import User
from app.services.ai_service import build_system_prompt, resolve_user_locale


def test_resolve_user_locale_prefers_request():
    user = User(
        oidc_subject="sub",
        email="u@example.com",
        display_name="User",
        preferences={"locale": "en"},
    )
    assert resolve_user_locale(user, "es") == "es"


def test_resolve_user_locale_falls_back_to_preferences():
    user = User(
        oidc_subject="sub",
        email="u@example.com",
        display_name="User",
        preferences={"locale": "es"},
    )
    assert resolve_user_locale(user, None) == "es"


def test_resolve_user_locale_defaults_to_en():
    user = User(
        oidc_subject="sub",
        email="u@example.com",
        display_name="User",
        preferences={},
    )
    assert resolve_user_locale(user, None) == "en"
    assert resolve_user_locale(user, "fr") == "en"


def test_build_system_prompt_includes_english_by_default():
    prompt = build_system_prompt("en")
    assert "## Language" in prompt
    assert "English (en)" in prompt
    assert "Respond in English by default" in prompt


def test_build_system_prompt_includes_spanish():
    prompt = build_system_prompt("es")
    assert "Spanish (es)" in prompt
    assert "Respond in Spanish by default" in prompt


@pytest.mark.parametrize("locale", ["en", "es"])
def test_build_system_prompt_honors_translation_requests(locale: str):
    prompt = build_system_prompt(locale)
    assert "requests a translation" in prompt
