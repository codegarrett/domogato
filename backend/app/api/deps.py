from collections.abc import AsyncGenerator
from uuid import UUID

import structlog
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.core.local_jwt import decode_local_token, is_local_token
from app.core.security import validate_token
from app.services.user_service import get_or_create_user, get_user_by_id

logger = structlog.get_logger()

bearer_scheme = HTTPBearer(auto_error=False)

engine = create_async_engine(
    settings.DATABASE_URL,
    pool_size=settings.DB_POOL_SIZE,
    max_overflow=settings.DB_MAX_OVERFLOW,
    pool_recycle=settings.DB_POOL_RECYCLE,
    echo=settings.DEBUG,
)

async_session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

redis_client: Redis | None = None


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def get_redis() -> Redis:
    global redis_client
    if redis_client is None:
        redis_client = Redis.from_url(settings.REDIS_URL, decode_responses=True)
    return redis_client


async def init_redis() -> None:
    global redis_client
    redis_client = Redis.from_url(settings.REDIS_URL, decode_responses=True)


async def close_redis() -> None:
    global redis_client
    if redis_client is not None:
        await redis_client.close()
        redis_client = None


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
):
    """Extract and validate JWT, then get or create the user.
    Supports both locally-issued JWTs (iss=projecthub) and OIDC JWTs.
    """
    from app.models.user import User

    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    local = is_local_token(token)
    await logger.adebug("auth_token_received", is_local=local, token_prefix=token[:20] if token else "")

    if local:
        claims = decode_local_token(token)
        user_id = claims.get("sub")
        if not user_id:
            await logger.awarning("auth_local_token_missing_subject")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: missing subject",
                headers={"WWW-Authenticate": "Bearer"},
            )
        user = await get_user_by_id(db, UUID(user_id))
        if user is None:
            await logger.awarning("auth_local_user_not_found", user_id=user_id)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
                headers={"WWW-Authenticate": "Bearer"},
            )
    else:
        try:
            claims = await validate_token(token)
        except HTTPException as e:
            if e.status_code == 503:
                await logger.awarning(
                    "auth_oidc_unreachable_for_non_local_token",
                    token_prefix=token[:20] if token else "",
                )
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid or unverifiable token",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            raise
        user = await get_or_create_user(db, claims)

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated",
        )

    return user


