from __future__ import annotations

import uuid

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.project import Project
from app.services import user_story_service


@pytest.mark.asyncio
async def test_parent_cycle_rejected(db_session: AsyncSession, test_project: Project):
    parent = await user_story_service.create_user_story(
        db_session, project_id=test_project.id, title="Parent",
    )
    child = await user_story_service.create_user_story(
        db_session, project_id=test_project.id, title="Child", created_by=None,
    )
    await user_story_service.update_user_story(db_session, child.id, parent_id=parent.id)

    with pytest.raises(ValueError, match="cycle"):
        await user_story_service.update_user_story(
            db_session, parent.id, parent_id=child.id,
        )


@pytest.mark.asyncio
async def test_validate_refined_fields():
    from app.models.user_story import UserStory

    story = UserStory(title="T", project_id=uuid.uuid4())
    missing = user_story_service._validate_refined_fields(story)
    assert "story_title" in missing
    assert "story_body" in missing
    assert "story_acceptance_criteria" in missing
