"""AI agent skill system."""
from app.services.agent.skills import (
    BaseSkill,
    SkillContext,
    SkillRegistry,
    SkillError,
    SkillPermissionError,
    SkillNotFoundError,
    check_project_access,
)

registry = SkillRegistry()


def _register_builtin_skills() -> None:
    from app.services.agent.builtin_skills import (
        ListMyProjectsSkill,
        SearchTicketsSkill,
        GetTicketDetailsSkill,
        GetSprintStatusSkill,
        SearchKnowledgeBaseSkill,
        SemanticSearchKBSkill,
        CreateTicketSkill,
        UpdateTicketSkill,
        TransitionTicketStatusSkill,
    )
    from app.services.agent.interaction_skills import (
        PresentChoicesSkill,
        RequestApprovalSkill,
    )
    from app.services.agent.issue_report_skills import (
        SearchIssueReportsSkill,
        CreateIssueReportSkill,
        AddReporterToIssueReportSkill,
        CreateTicketFromIssueReportsSkill,
    )
    registry.register(ListMyProjectsSkill())
    registry.register(SearchTicketsSkill())
    registry.register(GetTicketDetailsSkill())
    registry.register(GetSprintStatusSkill())
    registry.register(SearchKnowledgeBaseSkill())
    registry.register(SemanticSearchKBSkill())
    registry.register(CreateTicketSkill())
    registry.register(UpdateTicketSkill())
    registry.register(TransitionTicketStatusSkill())
    registry.register(PresentChoicesSkill())
    registry.register(RequestApprovalSkill())
    registry.register(SearchIssueReportsSkill())
    registry.register(CreateIssueReportSkill())
    registry.register(AddReporterToIssueReportSkill())
    registry.register(CreateTicketFromIssueReportsSkill())


_register_builtin_skills()

__all__ = [
    "BaseSkill",
    "SkillContext",
    "SkillRegistry",
    "SkillError",
    "SkillPermissionError",
    "SkillNotFoundError",
    "check_project_access",
    "registry",
]
