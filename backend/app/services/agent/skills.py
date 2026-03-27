"""Skill framework for the AI agent.

Provides the abstract base class for skills, a central registry,
and permission-aware execution helpers.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import (
    ProjectRole,
    PROJECT_ROLE_HIERARCHY,
    resolve_effective_project_role,
)
from app.models.project import Project
from app.models.user import User


class SkillError(Exception):
    """Base exception for skill operations."""


class SkillPermissionError(SkillError):
    """User lacks permission to execute this skill in the given context."""


class SkillNotFoundError(SkillError):
    """Requested skill does not exist in the registry."""


@dataclass
class SkillContext:
    """Execution context passed to every skill."""
    db: AsyncSession
    user: User
    params: dict


class BaseSkill(ABC):
    """Abstract base class for agent skills."""

    name: str
    description: str
    parameters_schema: dict
    category: str

    @abstractmethod
    async def execute(self, ctx: SkillContext) -> dict:
        """Execute the skill and return a structured result dict."""
        ...

    def to_openai_tool(self) -> dict:
        """Convert this skill to OpenAI function-calling format."""
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": self.parameters_schema,
            },
        }


class SkillRegistry:
    """Central registry for agent skills."""

    def __init__(self) -> None:
        self._skills: dict[str, BaseSkill] = {}

    def register(self, skill: BaseSkill) -> None:
        self._skills[skill.name] = skill

    def get(self, name: str) -> BaseSkill | None:
        return self._skills.get(name)

    def list_all(self) -> list[BaseSkill]:
        return list(self._skills.values())

    def to_openai_tools(self) -> list[dict]:
        return [s.to_openai_tool() for s in self._skills.values()]

    def __len__(self) -> int:
        return len(self._skills)


async def check_project_access(
    db: AsyncSession,
    user: User,
    project_key: str,
    min_role: ProjectRole = ProjectRole.GUEST,
) -> Project:
    """Resolve a project by key and verify the user has sufficient access.

    Returns the Project on success, raises SkillPermissionError on failure.
    """
    result = await db.execute(
        select(Project).where(
            Project.key == project_key.upper(),
            Project.is_archived == False,
        )
    )
    project = result.scalar_one_or_none()
    if project is None:
        raise SkillPermissionError(f"Project '{project_key}' not found")

    effective_role = await resolve_effective_project_role(
        user_id=user.id,
        project_id=project.id,
        organization_id=project.organization_id,
        project_visibility=project.visibility,
        is_system_admin=user.is_system_admin,
        db=db,
    )

    if effective_role is None:
        raise SkillPermissionError(f"You don't have access to project '{project_key}'")

    if PROJECT_ROLE_HIERARCHY[effective_role] < PROJECT_ROLE_HIERARCHY[min_role]:
        raise SkillPermissionError(
            f"You need at least {min_role.value} role on project '{project_key}'"
        )

    return project
