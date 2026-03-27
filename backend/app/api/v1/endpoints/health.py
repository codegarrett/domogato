from fastapi import APIRouter, Depends
from redis.asyncio import Redis
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_redis
from app.schemas.common import HealthResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health_check(
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
) -> HealthResponse:
    db_status = "connected"
    try:
        await db.execute(text("SELECT 1"))
    except Exception:
        db_status = "disconnected"

    redis_status = "connected"
    try:
        await redis.ping()
    except Exception:
        redis_status = "disconnected"

    status = "ok" if db_status == "connected" and redis_status == "connected" else "degraded"
    return HealthResponse(status=status, db=db_status, redis=redis_status)
