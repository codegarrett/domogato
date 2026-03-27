from __future__ import annotations

import time
from typing import Any

from jose import JWTError, jwt
from fastapi import HTTPException, status

from app.core.config import settings

ALGORITHM = "HS256"
ISSUER = "projecthub"


def create_access_token(user_id: str, email: str, expires_minutes: int | None = None) -> str:
    """Create a locally-issued JWT access token signed with SECRET_KEY."""
    exp_minutes = expires_minutes or settings.LOCAL_JWT_EXPIRE_MINUTES
    now = int(time.time())
    payload = {
        "iss": ISSUER,
        "sub": user_id,
        "email": email,
        "iat": now,
        "exp": now + (exp_minutes * 60),
        "type": "access",
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=ALGORITHM)


def decode_local_token(token: str) -> dict[str, Any]:
    """Validate and decode a locally-issued JWT. Raises HTTPException on failure."""
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[ALGORITHM],
            issuer=ISSUER,
            options={"verify_aud": False},
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {e}",
            headers={"WWW-Authenticate": "Bearer"},
        )


def is_local_token(token: str) -> bool:
    """Check if a token was issued locally without full validation."""
    try:
        claims = jwt.get_unverified_claims(token)
        return claims.get("iss") == ISSUER
    except JWTError:
        return False
