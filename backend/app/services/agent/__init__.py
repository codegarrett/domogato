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
    from app.services.agent.workflow_skills import GetTicketTransitionsSkill
    from app.services.agent.productivity_skills import (
        GlobalSearchSkill,
        GetMyDashboardSkill,
        ListTicketCommentsSkill,
        AddTicketCommentSkill,
        WatchTicketSkill,
        UnwatchTicketSkill,
    )
    from app.services.agent.file_skills import (
        ListConversationAttachmentsSkill,
        AttachFileToTicketSkill,
        AttachFileToIssueReportSkill,
    )
    from app.services.agent.kb_skills import ListKBSpacesSkill, CreateKBPageSkill
    registry.register(ListMyProjectsSkill())
    registry.register(SearchTicketsSkill())
    registry.register(GetTicketDetailsSkill())
    registry.register(GetSprintStatusSkill())
    registry.register(SearchKnowledgeBaseSkill())
    registry.register(SemanticSearchKBSkill())
    registry.register(ListKBSpacesSkill())
    registry.register(CreateKBPageSkill())
    registry.register(CreateTicketSkill())
    registry.register(UpdateTicketSkill())
    registry.register(TransitionTicketStatusSkill())
    registry.register(GetTicketTransitionsSkill())
    registry.register(PresentChoicesSkill())
    registry.register(RequestApprovalSkill())
    registry.register(SearchIssueReportsSkill())
    registry.register(CreateIssueReportSkill())
    registry.register(AddReporterToIssueReportSkill())
    registry.register(CreateTicketFromIssueReportsSkill())
    registry.register(GlobalSearchSkill())
    registry.register(GetMyDashboardSkill())
    registry.register(ListTicketCommentsSkill())
    registry.register(AddTicketCommentSkill())
    registry.register(WatchTicketSkill())
    registry.register(UnwatchTicketSkill())
    registry.register(ListConversationAttachmentsSkill())
    registry.register(AttachFileToTicketSkill())
    registry.register(AttachFileToIssueReportSkill())


_register_builtin_skills()

__all__ = [
    "BaseSkill",
    "SkillContext",
    "SkillRegistry",
    "SkillError",
    "SkillPermissionError",
    "SkillNotFoundError",
    "check_project_access",
    "resolve_ticket",
    "resolve_workflow_status_id",
    "resolve_assignee_id",
    "resolve_sprint_id_by_name",
    "resolve_epic_id_by_title",
    "registry",
]
