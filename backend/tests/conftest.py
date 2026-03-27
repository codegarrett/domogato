from __future__ import annotations

import uuid
from collections.abc import AsyncGenerator
from typing import Any

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

from app.core.config import settings
from app.models.base import Base
from app.models import User, Organization, Project, OrgMembership, ProjectMembership
from app.api.deps import get_db, get_current_user, get_redis
from app.main import create_app


def _build_test_db_url() -> str:
    url = settings.DATABASE_URL
    base, _, _ = url.rpartition("/")
    return f"{base}/projecthub_test"


TEST_DATABASE_URL = _build_test_db_url()

_tables_created = False


class FakeRedis:
    """Minimal Redis mock for testing."""

    async def ping(self) -> bool:
        return True

    async def get(self, key: str) -> None:
        return None

    async def set(self, key: str, value: Any, **kwargs: Any) -> bool:
        return True

    async def delete(self, key: str) -> bool:
        return True


_fake_redis = FakeRedis()


@pytest_asyncio.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Provide a transactional DB session that rolls back after each test."""
    global _tables_created
    engine = create_async_engine(TEST_DATABASE_URL, echo=False, pool_size=5)

    if not _tables_created:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
            await conn.run_sync(Base.metadata.create_all)
        _tables_created = True

    conn = await engine.connect()
    trans = await conn.begin()
    session = AsyncSession(bind=conn, expire_on_commit=False)
    try:
        yield session
    finally:
        await session.close()
        await trans.rollback()
        await conn.close()
        await engine.dispose()


@pytest_asyncio.fixture
async def db(db_session: AsyncSession) -> AsyncSession:
    return db_session


def make_fake_user(
    *,
    user_id: uuid.UUID | None = None,
    email: str = "test@example.com",
    display_name: str = "Test User",
    is_system_admin: bool = False,
    is_active: bool = True,
    oidc_subject: str | None = None,
) -> User:
    """Create a User instance (not persisted) for testing."""
    return User(
        id=user_id or uuid.uuid4(),
        oidc_subject=oidc_subject or f"oidc-{uuid.uuid4().hex[:12]}",
        email=email,
        display_name=display_name,
        is_system_admin=is_system_admin,
        is_active=is_active,
        preferences={},
    )


@pytest_asyncio.fixture
async def test_user(db_session: AsyncSession) -> User:
    user = make_fake_user(email="testuser@example.com", display_name="Test User")
    db_session.add(user)
    await db_session.flush()
    return user


@pytest_asyncio.fixture
async def admin_user(db_session: AsyncSession) -> User:
    user = make_fake_user(
        email="admin@example.com",
        display_name="Admin User",
        is_system_admin=True,
    )
    db_session.add(user)
    await db_session.flush()
    return user


@pytest_asyncio.fixture
async def test_org(db_session: AsyncSession) -> Organization:
    org = Organization(name="Test Organization", slug="test-org")
    db_session.add(org)
    await db_session.flush()
    return org


@pytest_asyncio.fixture
async def test_project(db_session: AsyncSession, test_org: Organization) -> Project:
    project = Project(
        organization_id=test_org.id,
        name="Test Project",
        key="TEST",
        visibility="internal",
    )
    db_session.add(project)
    await db_session.flush()
    return project


def create_test_app(current_user: User | None = None, db_override: AsyncSession | None = None):
    """Create a FastAPI test app with dependency overrides."""
    app = create_app()

    async def override_get_redis():
        return _fake_redis

    app.dependency_overrides[get_redis] = override_get_redis

    if db_override is not None:
        async def override_get_db():
            yield db_override
        app.dependency_overrides[get_db] = override_get_db

    if current_user is not None:
        async def override_get_current_user():
            return current_user
        app.dependency_overrides[get_current_user] = override_get_current_user

    return app


@pytest_asyncio.fixture
async def client(db_session: AsyncSession, test_user: User) -> AsyncGenerator[AsyncClient, None]:
    app = create_test_app(current_user=test_user, db_override=db_session)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


@pytest_asyncio.fixture
async def admin_client(db_session: AsyncSession, admin_user: User) -> AsyncGenerator[AsyncClient, None]:
    app = create_test_app(current_user=admin_user, db_override=db_session)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


@pytest_asyncio.fixture
async def anon_client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    from fastapi import HTTPException, status as http_status

    app = create_test_app(db_override=db_session)

    async def override_get_current_user_unauthenticated():
        raise HTTPException(
            status_code=http_status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

    app.dependency_overrides[get_current_user] = override_get_current_user_unauthenticated
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
