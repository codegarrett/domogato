#!/usr/bin/env python3
"""Seed deterministic E2E fixtures and write IDs to .seed-state.json."""
from __future__ import annotations

import json
import os
import sys
from datetime import date, timedelta
from pathlib import Path
from uuid import UUID

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select

from app.api.deps import async_session_factory
from app.core.password import hash_password
from app.models import (
    Organization,
    OrgMembership,
    Project,
    ProjectMembership,
    User,
    WorkflowStatus,
)
from app.schemas.kb import PageCreate, SpaceCreate
from app.services import custom_field_service, issue_report_service, kb_service, ticket_service, user_story_service
from app.services.agent_skill_service import upsert_skill
from app.services.board_service import create_default_board_for_workflow
from app.services.sprint_service import create_sprint, start_sprint
from app.services.workflow_service import seed_default_workflows

ADMIN_EMAIL = "e2e-admin@domogato.test"
ADMIN_PASSWORD = "E2eAdmin!Pass123"
USER_EMAIL = "e2e-user@domogato.test"
USER_PASSWORD = "E2eUser!Pass123"
GUEST_EMAIL = "e2e-guest@domogato.test"
GUEST_PASSWORD = "E2eGuest!Pass123"
REPORTER_EMAIL = "e2e-reporter@domogato.test"
REPORTER_PASSWORD = "E2eReporter!Pass123"
MAINTAINER_EMAIL = "e2e-maintainer@domogato.test"
MAINTAINER_PASSWORD = "E2eMaintainer!Pass123"

ORG_NAME = "E2E Org"
ORG_SLUG = "e2e-org"
PROJECT_NAME = "E2E Project"
PROJECT_KEY = "E2E"

WIREMOCK_SKILL_MD = """---
tool_name: e2e_weather
description: Fetch weather data from Wiremock for E2E tests
category: integrations
min_role: guest
parameters:
  type: object
  properties:
    project_key:
      type: string
    city:
      type: string
      description: City name
  required: [project_key, city]
request:
  method: GET
  url: "http://wiremock:8080/e2e/weather?city={city}"
---
E2E weather skill backed by Wiremock.
"""


def _seed_state_path() -> Path:
    env_path = os.environ.get("E2E_SEED_STATE_PATH")
    if env_path:
        return Path(env_path)
    repo_root = Path(__file__).resolve().parent.parent.parent
    return repo_root / "frontend" / "e2e" / ".seed-state.json"


async def run_seed() -> dict:
    state: dict = {
        "adminEmail": ADMIN_EMAIL,
        "adminPassword": ADMIN_PASSWORD,
        "userEmail": USER_EMAIL,
        "userPassword": USER_PASSWORD,
        "guestEmail": GUEST_EMAIL,
        "guestPassword": GUEST_PASSWORD,
        "reporterEmail": REPORTER_EMAIL,
        "reporterPassword": REPORTER_PASSWORD,
        "maintainerEmail": MAINTAINER_EMAIL,
        "maintainerPassword": MAINTAINER_PASSWORD,
        "orgSlug": ORG_SLUG,
        "projectKey": PROJECT_KEY,
    }

    async with async_session_factory() as db:
        admin = User(
            oidc_subject="e2e-admin-oidc",
            email=ADMIN_EMAIL,
            display_name="E2E Admin",
            password_hash=hash_password(ADMIN_PASSWORD),
            is_system_admin=True,
            is_active=True,
            preferences={},
        )
        member = User(
            oidc_subject="e2e-user-oidc",
            email=USER_EMAIL,
            display_name="E2E User",
            password_hash=hash_password(USER_PASSWORD),
            is_system_admin=False,
            is_active=True,
            preferences={},
        )
        guest = User(
            oidc_subject="e2e-guest-oidc",
            email=GUEST_EMAIL,
            display_name="E2E Guest",
            password_hash=hash_password(GUEST_PASSWORD),
            is_system_admin=False,
            is_active=True,
            preferences={},
        )
        reporter = User(
            oidc_subject="e2e-reporter-oidc",
            email=REPORTER_EMAIL,
            display_name="E2E Reporter",
            password_hash=hash_password(REPORTER_PASSWORD),
            is_system_admin=False,
            is_active=True,
            preferences={},
        )
        maintainer_user = User(
            oidc_subject="e2e-maintainer-oidc",
            email=MAINTAINER_EMAIL,
            display_name="E2E Maintainer",
            password_hash=hash_password(MAINTAINER_PASSWORD),
            is_system_admin=False,
            is_active=True,
            preferences={},
        )
        db.add_all([admin, member, guest, reporter, maintainer_user])
        await db.flush()

        org = Organization(name=ORG_NAME, slug=ORG_SLUG)
        db.add(org)
        await db.flush()

        db.add_all([
            OrgMembership(user_id=admin.id, organization_id=org.id, role="owner"),
            OrgMembership(user_id=member.id, organization_id=org.id, role="member"),
            OrgMembership(user_id=guest.id, organization_id=org.id, role="member"),
            OrgMembership(user_id=reporter.id, organization_id=org.id, role="member"),
            OrgMembership(user_id=maintainer_user.id, organization_id=org.id, role="member"),
        ])
        await db.flush()

        workflows = await seed_default_workflows(db, org.id)
        kanban = next(w for w in workflows if w.name == "Simple Kanban")

        project = Project(
            organization_id=org.id,
            name=PROJECT_NAME,
            key=PROJECT_KEY,
            visibility="internal",
            default_workflow_id=kanban.id,
        )
        db.add(project)
        await db.flush()

        db.add_all([
            ProjectMembership(user_id=admin.id, project_id=project.id, role="maintainer"),
            ProjectMembership(user_id=member.id, project_id=project.id, role="developer"),
            ProjectMembership(user_id=reporter.id, project_id=project.id, role="reporter"),
            ProjectMembership(user_id=maintainer_user.id, project_id=project.id, role="maintainer"),
        ])
        await db.flush()

        await create_default_board_for_workflow(
            db, project.id, kanban.id, board_name="E2E Board",
        )

        statuses = (
            await db.execute(
                select(WorkflowStatus)
                .where(WorkflowStatus.workflow_id == kanban.id)
                .order_by(WorkflowStatus.position)
            )
        ).scalars().all()
        status_by_name = {s.name: s for s in statuses}

        sprint = await create_sprint(
            db,
            project_id=project.id,
            name="E2E Sprint 1",
            goal="E2E active sprint",
            start_date=date.today() - timedelta(days=3),
            end_date=date.today() + timedelta(days=11),
        )
        await start_sprint(db, sprint.id)

        ticket_specs = [
            ("E2E Login Bug", "bug", "high", member.id, "To Do", sprint.id),
            ("E2E API Endpoint", "story", "medium", admin.id, "In Progress", sprint.id),
            ("E2E Dashboard Widget", "task", "low", None, "To Do", None),
            ("E2E Docs Update", "task", "medium", member.id, "Done", sprint.id),
            ("E2E Performance Test", "task", "high", admin.id, "In Progress", None),
        ]
        ticket_ids: list[str] = []
        for title, ttype, priority, assignee, status_name, sprint_id in ticket_specs:
            ticket = await ticket_service.create_ticket(
                db,
                project_id=project.id,
                title=title,
                description=f"Seeded ticket: {title}",
                ticket_type=ttype,
                priority=priority,
                assignee_id=assignee,
                reporter_id=admin.id,
                sprint_id=sprint_id,
            )
            target_status = status_by_name.get(status_name)
            if target_status and ticket.workflow_status_id != target_status.id:
                ticket.workflow_status_id = target_status.id
            ticket_ids.append(str(ticket.id))
        await db.flush()

        kb_space = await kb_service.create_space(
            db,
            project.id,
            SpaceCreate(name="E2E Knowledge", description="Seeded KB space"),
            user_id=admin.id,
        )
        page1 = await kb_service.create_page(
            db,
            kb_space.id,
            PageCreate(
                title="Getting Started",
                content_markdown="# E2E Getting Started\n\nWelcome to the E2E knowledge base.",
                is_published=True,
            ),
            user_id=admin.id,
        )
        page2 = await kb_service.create_page(
            db,
            kb_space.id,
            PageCreate(
                title="Semantic Search Target",
                content_markdown=(
                    "# Semantic Search Target\n\n"
                    "The unique phrase **e2e-semantic-needle-42** appears only on this page."
                ),
                is_published=True,
            ),
            user_id=admin.id,
        )

        custom_field = await custom_field_service.create_field_definition(
            db,
            project_id=project.id,
            name="E2E Environment",
            field_type="text",
            description="Seeded custom field for E2E",
        )

        await upsert_skill(
            db,
            slug="e2e-weather",
            name="E2E Weather",
            content_md=WIREMOCK_SKILL_MD,
            project_id=project.id,
            updated_by_id=admin.id,
            enabled=True,
        )

        issue_report = await issue_report_service.create_issue_report(
            db,
            project_id=project.id,
            title="E2E Issue Report",
            description="Seeded issue report for queue tests.",
            priority="high",
            created_by=admin.id,
            reporter_name="E2E Reporter",
            reporter_email="reporter@domogato.test",
        )

        reporter_issue_report = await issue_report_service.create_issue_report(
            db,
            project_id=project.id,
            title="E2E Reporter Issue Report",
            description="Owned by e2e-reporter for RBAC tests.",
            priority="medium",
            created_by=reporter.id,
        )

        reporter_story = await user_story_service.create_user_story(
            db,
            project_id=project.id,
            title="E2E Reporter In Progress Story",
            created_by=reporter.id,
        )
        await user_story_service.update_user_story(
            db, reporter_story.id, status="in_progress",
        )

        dev_story = await user_story_service.create_user_story(
            db,
            project_id=project.id,
            title="E2E Developer Discovery Story",
            created_by=member.id,
        )
        await user_story_service.update_user_story(
            db, dev_story.id, status="discovery",
        )

        ready_story = await user_story_service.create_user_story(
            db,
            project_id=project.id,
            title="E2E Ready For Tickets Story",
            created_by=reporter.id,
        )
        await user_story_service.update_user_story(
            db,
            ready_story.id,
            status="story_ready",
            story_title="As a user I want RBAC",
            story_body="Story body for ticket creation tests.",
            story_acceptance_criteria="- Ticket can be created by developer",
        )

        await db.commit()

        state.update({
            "adminUserId": str(admin.id),
            "userUserId": str(member.id),
            "guestUserId": str(guest.id),
            "reporterUserId": str(reporter.id),
            "maintainerUserId": str(maintainer_user.id),
            "orgId": str(org.id),
            "projectId": str(project.id),
            "workflowId": str(kanban.id),
            "sprintId": str(sprint.id),
            "ticketIds": ticket_ids,
            "kbSpaceSlug": kb_space.slug,
            "kbPageSlugs": [page1.slug, page2.slug],
            "customFieldId": str(custom_field.id),
            "agentSkillSlug": "e2e-weather",
            "issueReportId": str(issue_report.id),
            "reporterIssueReportId": str(reporter_issue_report.id),
            "reporterStoryId": str(reporter_story.id),
            "developerStoryId": str(dev_story.id),
            "readyStoryId": str(ready_story.id),
        })

    out_path = _seed_state_path()
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(state, indent=2), encoding="utf-8")
    print(f"[e2e_seed] Wrote seed state to {out_path}")
    return state


if __name__ == "__main__":
    import asyncio

    asyncio.run(run_seed())
