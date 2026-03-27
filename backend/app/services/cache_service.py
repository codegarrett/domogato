"""Redis caching layer with graceful fallback when Redis is unavailable."""
from __future__ import annotations

import json
from typing import Any, Callable, Coroutine

import structlog

from app.api.deps import get_redis

logger = structlog.get_logger()

_MISS = object()


async def get_cached(
    key: str,
    loader: Callable[[], Coroutine[Any, Any, Any]],
    ttl: int = 300,
) -> Any:
    try:
        redis = await get_redis()
        cached = await redis.get(key)
        if cached is not None:
            await logger.adebug("cache_hit", key=key)
            return json.loads(cached)
    except Exception:
        await logger.awarning("cache_read_error", key=key)

    await logger.adebug("cache_miss", key=key)
    result = await loader()

    try:
        redis = await get_redis()
        await redis.set(key, json.dumps(result, default=str), ex=ttl)
    except Exception:
        await logger.awarning("cache_write_error", key=key)

    return result


async def invalidate(*keys: str) -> None:
    try:
        redis = await get_redis()
        if keys:
            await redis.delete(*keys)
            await logger.adebug("cache_invalidated", keys=keys)
    except Exception:
        await logger.awarning("cache_invalidate_error", keys=keys)


async def invalidate_pattern(pattern: str) -> None:
    try:
        redis = await get_redis()
        cursor = b"0"
        while True:
            cursor, found_keys = await redis.scan(cursor=cursor, match=pattern, count=100)
            if found_keys:
                await redis.delete(*found_keys)
            if cursor == b"0" or cursor == 0:
                break
        await logger.adebug("cache_pattern_invalidated", pattern=pattern)
    except Exception:
        await logger.awarning("cache_pattern_invalidate_error", pattern=pattern)
