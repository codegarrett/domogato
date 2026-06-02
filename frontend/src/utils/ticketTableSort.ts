import type { TicketListParams } from '@/api/tickets'
import type { Ticket } from '@/api/tickets'

export type TicketSortColumn =
  | 'key'
  | 'title'
  | 'ticket_type'
  | 'priority'
  | 'assignee'
  | 'status'
  | 'story_points'
  | 'created_at'

export type SortDirection = 'asc' | 'desc'

export const DEFAULT_TICKET_SORT_COLUMN: TicketSortColumn = 'priority'
export const DEFAULT_TICKET_SORT_DIRECTION: SortDirection = 'asc'

/** @deprecated Use TicketSortColumn */
export type PlanningSortColumn = TicketSortColumn

/** @deprecated Use DEFAULT_TICKET_SORT_COLUMN */
export const DEFAULT_PLANNING_SORT_COLUMN = DEFAULT_TICKET_SORT_COLUMN

/** @deprecated Use DEFAULT_TICKET_SORT_DIRECTION */
export const DEFAULT_PLANNING_SORT_DIRECTION = DEFAULT_TICKET_SORT_DIRECTION

const PRIORITY_RANK: Record<string, number> = {
  highest: 0,
  high: 1,
  medium: 2,
  low: 3,
  lowest: 4,
}

const TYPE_RANK: Record<string, number> = {
  epic: 0,
  story: 1,
  task: 2,
  bug: 3,
  subtask: 4,
}

export interface TicketSortContext {
  resolveAssigneeName: (id: string | null) => string
  resolveStatusName: (id: string) => string
}

/** @deprecated Use TicketSortContext */
export type PlanningSortContext = TicketSortContext

function priorityRank(priority: string): number {
  return PRIORITY_RANK[priority] ?? 99
}

function typeRank(ticketType: string): number {
  return TYPE_RANK[ticketType] ?? 99
}

function compareNullableNumbers(a: number | null, b: number | null): number {
  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1
  if (a === b) return 0
  return a < b ? -1 : 1
}

function compareStrings(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: 'base' })
}

export function compareTickets(
  a: Ticket,
  b: Ticket,
  column: TicketSortColumn,
  dir: SortDirection,
  ctx: TicketSortContext,
): number {
  let cmp = 0

  switch (column) {
    case 'key':
      cmp = a.ticket_number - b.ticket_number
      break
    case 'title':
      cmp = compareStrings(a.title, b.title)
      break
    case 'ticket_type':
      cmp = typeRank(a.ticket_type) - typeRank(b.ticket_type)
      if (cmp === 0) cmp = compareStrings(a.ticket_type, b.ticket_type)
      break
    case 'priority':
      cmp = priorityRank(a.priority) - priorityRank(b.priority)
      if (cmp === 0) cmp = compareStrings(a.priority, b.priority)
      break
    case 'assignee': {
      const an = ctx.resolveAssigneeName(a.assignee_id)
      const bn = ctx.resolveAssigneeName(b.assignee_id)
      const aUnassigned = an === '—'
      const bUnassigned = bn === '—'
      if (aUnassigned && bUnassigned) cmp = 0
      else if (aUnassigned) cmp = 1
      else if (bUnassigned) cmp = -1
      else cmp = compareStrings(an, bn)
      break
    }
    case 'status':
      cmp = compareStrings(
        ctx.resolveStatusName(a.workflow_status_id),
        ctx.resolveStatusName(b.workflow_status_id),
      )
      break
    case 'story_points':
      cmp = compareNullableNumbers(a.story_points, b.story_points)
      break
    case 'created_at':
      cmp = compareStrings(a.created_at, b.created_at)
      break
  }

  return dir === 'asc' ? cmp : -cmp
}

/** @deprecated Use compareTickets */
export const comparePlanningTickets = compareTickets

export function sortTicketsInPlace(
  tickets: Ticket[],
  column: TicketSortColumn,
  dir: SortDirection,
  ctx: TicketSortContext,
): void {
  tickets.sort((a, b) => compareTickets(a, b, column, dir, ctx))
}

/** @deprecated Use sortTicketsInPlace */
export const sortPlanningTicketsInPlace = sortTicketsInPlace

export function toggleTicketSort(
  column: TicketSortColumn,
  currentColumn: TicketSortColumn,
  currentDir: SortDirection,
): { column: TicketSortColumn; direction: SortDirection } {
  if (currentColumn === column) {
    return {
      column,
      direction: currentDir === 'asc' ? 'desc' : 'asc',
    }
  }
  return { column, direction: 'asc' }
}

/** @deprecated Use toggleTicketSort */
export const togglePlanningSort = toggleTicketSort

export type TicketListSortBy = NonNullable<TicketListParams['sort_by']>

export function sortColumnToApiParams(
  column: TicketSortColumn,
  direction: SortDirection,
): { sort_by: TicketListSortBy; sort_dir: SortDirection } {
  const map: Record<TicketSortColumn, TicketListSortBy> = {
    key: 'ticket_number',
    title: 'title',
    ticket_type: 'ticket_type',
    priority: 'priority',
    assignee: 'assignee_id',
    status: 'workflow_status_id',
    story_points: 'story_points',
    created_at: 'created_at',
  }
  return { sort_by: map[column], sort_dir: direction }
}
