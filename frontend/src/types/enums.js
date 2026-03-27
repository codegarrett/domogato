export var OrgRole;
(function (OrgRole) {
    OrgRole["Owner"] = "owner";
    OrgRole["Admin"] = "admin";
    OrgRole["Member"] = "member";
})(OrgRole || (OrgRole = {}));
export var ProjectRole;
(function (ProjectRole) {
    ProjectRole["Owner"] = "owner";
    ProjectRole["Maintainer"] = "maintainer";
    ProjectRole["Developer"] = "developer";
    ProjectRole["Reporter"] = "reporter";
    ProjectRole["Guest"] = "guest";
})(ProjectRole || (ProjectRole = {}));
export var TicketPriority;
(function (TicketPriority) {
    TicketPriority["Critical"] = "critical";
    TicketPriority["High"] = "high";
    TicketPriority["Medium"] = "medium";
    TicketPriority["Low"] = "low";
    TicketPriority["None"] = "none";
})(TicketPriority || (TicketPriority = {}));
export var SprintStatus;
(function (SprintStatus) {
    SprintStatus["Planning"] = "planning";
    SprintStatus["Active"] = "active";
    SprintStatus["Completed"] = "completed";
})(SprintStatus || (SprintStatus = {}));
