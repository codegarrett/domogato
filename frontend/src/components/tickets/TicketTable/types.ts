import type { TicketSortColumn } from '@/utils/ticketTableSort'

/** Non-sortable structural columns in the grid. */
export type TicketTableStructuralColumn = 'select' | 'drag'

/** Data columns that may appear in the table. */
export type TicketTableDataColumn =
  | 'key'
  | 'title'
  | 'ticket_type'
  | 'priority'
  | 'assignee'
  | 'status'
  | 'story_points'
  | 'created_at'

export type TicketTableColumnId = TicketTableStructuralColumn | TicketTableDataColumn

export const PLANNING_COLUMNS: TicketTableColumnId[] = [
  'select',
  'drag',
  'key',
  'title',
  'ticket_type',
  'priority',
  'assignee',
  'status',
  'story_points',
]

export const LIST_COLUMNS: TicketTableColumnId[] = [
  'select',
  'key',
  'title',
  'ticket_type',
  'priority',
  'assignee',
  'status',
  'story_points',
  'created_at',
]

const SORTABLE_DATA_COLUMNS: TicketTableDataColumn[] = [
  'key',
  'title',
  'ticket_type',
  'priority',
  'assignee',
  'status',
  'story_points',
  'created_at',
]

export function isSortableColumn(col: TicketTableColumnId): col is TicketTableDataColumn {
  return (SORTABLE_DATA_COLUMNS as TicketTableColumnId[]).includes(col)
}

export function columnToSortKey(col: TicketTableDataColumn): TicketSortColumn {
  return col
}

export function gridPresetClass(columns: TicketTableColumnId[]): string {
  if (columns.includes('drag')) return 'ticket-table-grid--planning'
  return 'ticket-table-grid--list'
}

export function columnLabelKey(col: TicketTableColumnId): string {
  switch (col) {
    case 'key':
      return 'projects.key'
    case 'title':
      return 'tickets.title'
    case 'ticket_type':
      return 'tickets.type'
    case 'priority':
      return 'tickets.priority'
    case 'assignee':
      return 'tickets.assignee'
    case 'status':
      return 'common.status'
    case 'story_points':
      return 'sprints.pointsCol'
    case 'created_at':
      return 'common.created'
    default:
      return ''
  }
}
