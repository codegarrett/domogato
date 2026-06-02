export interface TicketLinkFields {
  project_id: string
  ticket_key?: string | null
  project_key?: string | null
  ticket_number?: number
}

export function ticketRef(ticket: TicketLinkFields): string {
  if (ticket.ticket_key) {
    return ticket.ticket_key.toLowerCase()
  }
  if (ticket.project_key != null && ticket.ticket_number != null) {
    return `${ticket.project_key.toLowerCase()}-${ticket.ticket_number}`
  }
  return String(ticket.ticket_number ?? '')
}

export function ticketDetailPath(
  projectId: string,
  ticket: TicketLinkFields,
): string {
  return `/projects/${projectId}/tickets/${ticketRef(ticket)}`
}

export function ticketDetailPathFromRef(
  projectId: string,
  ticketRefSlug: string,
): string {
  return `/projects/${projectId}/tickets/${ticketRefSlug.toLowerCase()}`
}
