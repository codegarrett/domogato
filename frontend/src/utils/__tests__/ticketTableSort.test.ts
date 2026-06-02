import { describe, expect, it } from 'vitest'
import type { Ticket } from '@/api/tickets'
import { compareTickets, sortColumnToApiParams, sortTicketsInPlace } from '../ticketTableSort'

const ctx = {
  resolveAssigneeName: () => '—',
  resolveStatusName: () => 'Open',
}

function ticket(partial: Pick<Ticket, 'id' | 'ticket_number' | 'title'> & Partial<Ticket>): Ticket {
  return {
    project_id: 'p1',
    epic_id: null,
    sprint_id: null,
    parent_ticket_id: null,
    ticket_type: 'task',
    description: null,
    workflow_status_id: 's1',
    priority: 'medium',
    assignee_id: null,
    reporter_id: null,
    story_points: null,
    original_estimate_seconds: null,
    remaining_estimate_seconds: null,
    due_date: null,
    start_date: null,
    resolution: null,
    resolved_at: null,
    board_rank: '',
    backlog_rank: '',
    is_deleted: false,
    created_at: '',
    updated_at: '',
    project_key: 'PRJ',
    ticket_key: null,
    ...partial,
  } as Ticket
}

describe('ticketTableSort', () => {
  it('sorts key by ticket_number, not lexicographically', () => {
    const items = [
      ticket({ id: 'a', ticket_number: 11, title: 'Eleven' }),
      ticket({ id: 'b', ticket_number: 2, title: 'Two' }),
      ticket({ id: 'c', ticket_number: 1, title: 'One' }),
    ]
    sortTicketsInPlace(items, 'key', 'asc', ctx)
    expect(items.map((t) => t.ticket_number)).toEqual([1, 2, 11])
  })

  it('maps UI columns to API sort params', () => {
    expect(sortColumnToApiParams('key', 'desc')).toEqual({
      sort_by: 'ticket_number',
      sort_dir: 'desc',
    })
    expect(sortColumnToApiParams('assignee', 'asc')).toEqual({
      sort_by: 'assignee_id',
      sort_dir: 'asc',
    })
  })

  it('sorts priority with highest first when ascending', () => {
    expect(
      compareTickets(
        ticket({ id: 'a', ticket_number: 1, title: 'A', priority: 'highest' }),
        ticket({ id: 'b', ticket_number: 2, title: 'B', priority: 'low' }),
        'priority',
        'asc',
        ctx,
      ),
    ).toBeLessThan(0)
  })
})
