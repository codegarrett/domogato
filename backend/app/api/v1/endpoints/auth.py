from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.core.config import settings
from app.core.local_jwt import create_access_token
from app.core.password import hash_password, verify_password, validate_password_strength
from app.models.user import User
from app.services.system_settings_service import (
    get_effective_auth_settings,
    needs_setup,
)

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    display_name: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class AuthTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: dict


class AuthConfigResponse(BaseModel):
    auth_mode: str
    needs_setup: bool
    local_registration_enabled: bool
    oidc: dict | None = None


def _user_summary(user: User) -> dict:
    return {
        "id": str(user.id),
        "email": user.email,
        "display_name": user.display_name,
        "is_system_admin": user.is_system_admin,
    }


@router.get("/config", response_model=AuthConfigResponse)
async def get_auth_config(db: AsyncSession = Depends(get_db)):
    """Public endpoint returning auth configuration for the frontend."""
    effective = await get_effective_auth_settings(db)
    setup_needed = await needs_setup(db)
    auth_mode = effective["auth_mode"].value

    oidc_info = None
    if auth_mode == "oidc":
        oidc_info = {
            "issuer_url": effective["oidc_issuer_url"].value,
            "client_id": effective["oidc_client_id"].value,
        }

    return AuthConfigResponse(
        auth_mode=auth_mode,
        needs_setup=setup_needed,
        local_registration_enabled=bool(effective["local_registration_enabled"].value) if auth_mode == "local" else False,
        oidc=oidc_info,
    )


@router.get("/oidc-config")
async def get_oidc_config(db: AsyncSession = Depends(get_db)):
    """Return OIDC configuration for the frontend to initialize the OIDC client."""
    effective = await get_effective_auth_settings(db)
    auth_mode = effective["auth_mode"].value
    if auth_mode != "oidc":
        return {"issuer_url": None, "client_id": None}
    return {
        "issuer_url": effective["oidc_issuer_url"].value,
        "client_id": effective["oidc_client_id"].value,
    }


@router.post("/login", response_model=AuthTokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Authenticate with email and password (local auth mode only)."""
    effective = await get_effective_auth_settings(db)
    if effective["auth_mode"].value != "local":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Local authentication is not enabled",
        )

    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if user is None or not user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated",
        )

    from sqlalchemy import func
    user.last_login_at = func.now()
    await db.flush()
    await db.commit()

    token = create_access_token(
        user_id=str(user.id),
        email=user.email,
        expires_minutes=settings.LOCAL_JWT_EXPIRE_MINUTES,
    )

    return AuthTokenResponse(
        access_token=token,
        expires_in=settings.LOCAL_JWT_EXPIRE_MINUTES * 60,
        user=_user_summary(user),
    )


@router.post("/register", response_model=AuthTokenResponse, status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """Create a new user account with password (local auth, registration must be enabled)."""
    effective = await get_effective_auth_settings(db)
    if effective["auth_mode"].value != "local":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Local authentication is not enabled",
        )

    if not effective["local_registration_enabled"].value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Registration is not enabled",
        )

    pw_error = validate_password_strength(body.password)
    if pw_error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=pw_error)

    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists",
        )

    import uuid
    user_id = uuid.uuid4()
    user = User(
        id=user_id,
        oidc_subject=f"local:{user_id}",
        email=body.email,
        display_name=body.display_name.strip(),
        password_hash=hash_password(body.password),
        is_system_admin=False,
        is_active=True,
    )

    if settings.INITIAL_ADMIN_EMAIL and body.email.lower() == settings.INITIAL_ADMIN_EMAIL.lower():
        user.is_system_admin = True

    db.add(user)
    await db.flush()

    from app.services.auto_membership_service import apply_auto_join_for_new_user
    await apply_auto_join_for_new_user(db, user.id)

    await db.commit()

    token = create_access_token(
        user_id=str(user.id),
        email=user.email,
        expires_minutes=settings.LOCAL_JWT_EXPIRE_MINUTES,
    )

    return AuthTokenResponse(
        access_token=token,
        expires_in=settings.LOCAL_JWT_EXPIRE_MINUTES * 60,
        user=_user_summary(user),
    )


@router.post("/refresh", response_model=AuthTokenResponse)
async def refresh_token(
    current_user: User = Depends(get_current_user),
):
    """Issue a fresh access token for an authenticated user with a valid (non-expired) token."""
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated",
        )

    token = create_access_token(
        user_id=str(current_user.id),
        email=current_user.email,
        expires_minutes=settings.LOCAL_JWT_EXPIRE_MINUTES,
    )

    return AuthTokenResponse(
        access_token=token,
        expires_in=settings.LOCAL_JWT_EXPIRE_MINUTES * 60,
        user=_user_summary(current_user),
    )


@router.post("/change-password")
async def change_password(
    body: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Change the current user's password."""
    if not current_user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This account does not use password authentication",
        )

    if not verify_password(body.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )

    pw_error = validate_password_strength(body.new_password)
    if pw_error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=pw_error)

    current_user.password_hash = hash_password(body.new_password)
    await db.flush()

    return {"message": "Password changed successfully"}


@router.get("/account-url")
async def get_account_url(_user: User = Depends(get_current_user)):
    """Return Keycloak account management URLs derived from the OIDC issuer."""
    base = settings.OIDC_ISSUER_URL.rstrip("/")
    account_url = f"{base}/account"
    return {
        "account_url": account_url,
        "security_url": f"{account_url}/#/security/signingin",
        "password_url": f"{account_url}/#/security/signingin",
        "sessions_url": f"{account_url}/#/security/device-activity",
    }
