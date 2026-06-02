import type { Ticket } from '@/api/tickets'

export function displayTicketKey(ticket: Ticket, projectKey?: string | null): string {
  if (ticket.ticket_key) return ticket.ticket_key
  if (projectKey) return `${projectKey}-${ticket.ticket_number}`
  return `#${ticket.ticket_number}`
}
