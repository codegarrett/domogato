#!/usr/bin/env python3
"""Migrate KB user story pages (kb_page_meta) to PM user_stories entities."""
from __future__ import annotations

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import async_session_factory
from app.models.kb_page import KBPage
from app.models.kb_page_meta import KBPageMeta, KBPageTicketLink
from app.models.user_story import UserStory, UserStoryTicketLink

_CATEGORY_STATUS_MAP = {
    "draft": "not_started",
    "in_progress": "in_progress",
    "review": "discovery",
    "done": "story_ready",
}


def _map_status(meta: KBPageMeta, has_ticket_links: bool) -> str:
    if has_ticket_links:
        return "ticket_created"
    if meta.story_status and meta.story_status.category:
        return _CATEGORY_STATUS_MAP.get(meta.story_status.category, "not_started")
    return "not_started"


async def migrate(*, dry_run: bool = False) -> dict:
    summary = {
        "migrated": 0,
        "skipped": 0,
        "ticket_links_migrated": 0,
        "unmappable": [],
    }

    async with async_session_factory() as db:
        result = await db.execute(
            select(KBPageMeta)
            .options(
                selectinload(KBPageMeta.page),
                selectinload(KBPageMeta.story_status),
                selectinload(KBPageMeta.ticket_links),
            )
            .where(KBPageMeta.page_type == "user_story")
        )
        metas = result.scalars().all()

        for meta in metas:
            page = meta.page
            if page is None or page.is_deleted:
                summary["skipped"] += 1
                summary["unmappable"].append({
                    "page_meta_id": str(meta.id),
                    "reason": "page missing or deleted",
                })
                continue

            has_links = bool(meta.ticket_links)
            status = _map_status(meta, has_links)

            story = UserStory(
                project_id=meta.project_id,
                created_by=page.created_by,
                title=page.title,
                story_body=page.content_markdown or None,
                story_title=page.title,
                status=status,
                priority="medium",
            )
            if not dry_run:
                db.add(story)
                await db.flush()

                for link in meta.ticket_links:
                    db.add(UserStoryTicketLink(
                        user_story_id=story.id,
                        ticket_id=link.ticket_id,
                        created_by=link.created_by,
                    ))
                    summary["ticket_links_migrated"] += 1

            summary["migrated"] += 1

        if not dry_run:
            await db.commit()

    return summary


def main() -> None:
    dry_run = "--dry-run" in sys.argv
    summary = asyncio.run(migrate(dry_run=dry_run))
    mode = "DRY RUN" if dry_run else "MIGRATED"
    print(f"[{mode}] user stories: {summary['migrated']}, skipped: {summary['skipped']}")
    print(f"ticket links: {summary['ticket_links_migrated']}")
    if summary["unmappable"]:
        print("unmappable records:")
        for row in summary["unmappable"]:
            print(f"  - {row}")


if __name__ == "__main__":
    main()
