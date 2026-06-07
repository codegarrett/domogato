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


def register_builtin_skills(reg: SkillRegistry | None = None) -> None:
    target = reg if reg is not None else registry
    from app.services.agent.builtin_skills import (
        ListMyProjectsSkill,
        SearchTicketsSkill,
        GetTicketDetailsSkill,
        GetSprintStatusSkill,
        SearchKnowledgeBaseSkill,
        SemanticSearchKBSkill,
        SearchProjectDocumentsSkill,
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
    from app.services.agent.utility_skills import CalculatorSkill

    target.register(ListMyProjectsSkill())
    target.register(SearchTicketsSkill())
    target.register(GetTicketDetailsSkill())
    target.register(GetSprintStatusSkill())
    target.register(SearchKnowledgeBaseSkill())
    target.register(SemanticSearchKBSkill())
    target.register(SearchProjectDocumentsSkill())
    target.register(ListKBSpacesSkill())
    target.register(CreateKBPageSkill())
    target.register(CreateTicketSkill())
    target.register(UpdateTicketSkill())
    target.register(TransitionTicketStatusSkill())
    target.register(GetTicketTransitionsSkill())
    target.register(PresentChoicesSkill())
    target.register(RequestApprovalSkill())
    target.register(SearchIssueReportsSkill())
    target.register(CreateIssueReportSkill())
    target.register(AddReporterToIssueReportSkill())
    target.register(CreateTicketFromIssueReportsSkill())
    target.register(GlobalSearchSkill())
    target.register(GetMyDashboardSkill())
    target.register(ListTicketCommentsSkill())
    target.register(AddTicketCommentSkill())
    target.register(WatchTicketSkill())
    target.register(UnwatchTicketSkill())
    target.register(ListConversationAttachmentsSkill())
    target.register(AttachFileToTicketSkill())
    target.register(AttachFileToIssueReportSkill())
    target.register(CalculatorSkill())


register_builtin_skills()

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
    "register_builtin_skills",
]
