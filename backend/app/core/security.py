from __future__ import annotations

import time
from typing import Any

import httpx
from jose import JWTError, jwt
from fastapi import HTTPException, status

from app.core.config import settings

# Cached OIDC discovery and JWKS
_oidc_config: dict[str, Any] | None = None
_jwks: dict[str, Any] | None = None
_jwks_fetched_at: float = 0


async def get_oidc_config() -> dict[str, Any]:
    """Fetch and cache OIDC discovery document."""
    global _oidc_config
    if _oidc_config is not None:
        return _oidc_config
    discovery_url = f"{settings.OIDC_ISSUER_URL}/.well-known/openid-configuration"
    async with httpx.AsyncClient(verify=False) as client:
        resp = await client.get(discovery_url)
        resp.raise_for_status()
        _oidc_config = resp.json()
    return _oidc_config


async def get_jwks() -> dict[str, Any]:
    """Fetch and cache JWKS from the OIDC provider."""
    global _jwks, _jwks_fetched_at
    now = time.time()
    if _jwks is not None and (now - _jwks_fetched_at) < settings.OIDC_JWKS_CACHE_TTL:
        return _jwks
    config = await get_oidc_config()
    jwks_uri = config["jwks_uri"]
    async with httpx.AsyncClient(verify=False) as client:
        resp = await client.get(jwks_uri)
        resp.raise_for_status()
        _jwks = resp.json()
        _jwks_fetched_at = now
    return _jwks


async def validate_token(token: str) -> dict[str, Any]:
    """
    Validate a JWT access token against the OIDC provider's JWKS.
    Returns the decoded claims dict.
    Raises HTTPException on invalid/expired tokens.
    """
    try:
        jwks = await get_jwks()
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to fetch OIDC provider keys",
        )

    try:
        unverified_header = jwt.get_unverified_header(token)
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token format",
            headers={"WWW-Authenticate": "Bearer"},
        )

    decode_options: dict[str, Any] = {
        "verify_aud": settings.OIDC_AUDIENCE is not None,
    }
    audience = settings.OIDC_AUDIENCE or None

    try:
        payload = jwt.decode(
            token,
            jwks,
            algorithms=["RS256"],
            issuer=settings.OIDC_ISSUER_URL,
            audience=audience,
            options=decode_options,
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer error=\"invalid_token\", error_description=\"Token expired\""},
        )
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token validation failed: {e}",
            headers={"WWW-Authenticate": "Bearer"},
        )


def clear_oidc_cache() -> None:
    """Clear cached OIDC config and JWKS. Useful for testing."""
    global _oidc_config, _jwks, _jwks_fetched_at
    _oidc_config = None
    _jwks = None
    _jwks_fetched_at = 0
