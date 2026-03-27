export enum OrgRole {
  Owner = 'owner',
  Admin = 'admin',
  Member = 'member',
}

export enum ProjectRole {
  Owner = 'owner',
  Maintainer = 'maintainer',
  Developer = 'developer',
  Reporter = 'reporter',
  Guest = 'guest',
}

export enum TicketPriority {
  Critical = 'critical',
  High = 'high',
  Medium = 'medium',
  Low = 'low',
  None = 'none',
}

export enum SprintStatus {
  Planning = 'planning',
  Active = 'active',
  Completed = 'completed',
}
