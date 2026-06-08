#!/usr/bin/env python3
"""Reset E2E database schema and re-seed deterministic fixtures."""
from __future__ import annotations

import asyncio
import subprocess
import sys
from pathlib import Path

from sqlalchemy import text

BACKEND_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_ROOT))


def run_alembic(args: list[str]) -> None:
    result = subprocess.run(
        ["alembic", *args],
        cwd=BACKEND_ROOT,
        capture_output=True,
        text=True,
    )
    if result.stdout:
        print(result.stdout, end="")
    if result.returncode != 0:
        if result.stderr:
            print(result.stderr, file=sys.stderr, end="")
        raise SystemExit(result.returncode)


async def drop_and_recreate_schema() -> None:
    from app.api.deps import engine

    async with engine.begin() as conn:
        await conn.execute(text("DROP SCHEMA public CASCADE"))
        await conn.execute(text("CREATE SCHEMA public"))
        await conn.execute(text("GRANT ALL ON SCHEMA public TO public"))
        pg_user = conn.engine.url.username or "projecthub"
        await conn.execute(text(f'GRANT ALL ON SCHEMA public TO "{pg_user}"'))


def main() -> None:
    print("[e2e_reset] Dropping and recreating public schema...")
    asyncio.run(drop_and_recreate_schema())
    print("[e2e_reset] Upgrading database to head...")
    run_alembic(["upgrade", "head"])
    print("[e2e_reset] Seeding E2E fixtures...")
    seed_result = subprocess.run(
        [sys.executable, str(BACKEND_ROOT / "scripts" / "e2e_seed.py")],
        cwd=BACKEND_ROOT,
    )
    if seed_result.returncode != 0:
        raise SystemExit(seed_result.returncode)
    print("[e2e_reset] Done.")


if __name__ == "__main__":
    main()
