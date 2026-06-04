"""HttpOnly session cookie for browser asset requests (img src, etc.)."""
from __future__ import annotations

import time

from fastapi import Response
from jose import JWTError, jwt

from app.core.config import settings

COOKIE_NAME = "projecthub_access_token"
COOKIE_PATH = "/api"


def _cookie_max_age(token: str) -> int:
    try:
        claims = jwt.get_unverified_claims(token)
        exp = claims.get("exp")
        if isinstance(exp, (int, float)):
            return max(int(exp - time.time()), 60)
    except JWTError:
        pass
    return settings.LOCAL_JWT_EXPIRE_MINUTES * 60


def set_auth_cookie(response: Response, token: str, *, embed: bool = False) -> None:
    secure = settings.APP_BASE_URL.lower().startswith("https")
    samesite: str = "none" if embed and secure else "lax"
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        secure=secure if not embed else True,
        samesite=samesite,
        path=COOKIE_PATH,
        max_age=_cookie_max_age(token),
    )


def clear_auth_cookie(response: Response) -> None:
    response.delete_cookie(key=COOKIE_NAME, path=COOKIE_PATH)
