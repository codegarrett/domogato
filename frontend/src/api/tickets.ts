import apiClient from './client'
import type { PaginatedResponse } from '@/types/api'

export interface Ticket {
  id: string
  project_id: string
  epic_id: string | null
  sprint_id: string | null
  parent_ticket_id: string | null
  ticket_number: number
  ticket_type: string
  title: string
  description: string | null
  workflow_status_id: string
  priority: string
  assignee_id: string | null
  reporter_id: string | null
  story_points: number | null
  original_estimate_seconds: number | null
  remaining_estimate_seconds: number | null
  due_date: string | null
  start_date: string | null
  resolution: string | null
  resolved_at: string | null
  board_rank: string
  backlog_rank: string
  is_deleted: boolean
  created_at: string
  updated_at: string
  project_key: string | null
  ticket_key: string | null
}

export interface TicketListParams {
  offset?: number
  limit?: number
  search?: string
  ticket_type?: string
  priority?: string
  assignee_id?: string
  epic_id?: string
  sprint_id?: string
  workflow_status_id?: string
  is_deleted?: boolean
  sort_by?: string
  sort_dir?: string
}

export interface TicketCreate {
  title: string
  description?: string | null
  ticket_type?: string
  priority?: string
  assignee_id?: string | null
  epic_id?: string | null
  story_points?: number | null
  due_date?: string | null
  start_date?: string | null
  parent_ticket_id?: string | null
}

export interface TicketUpdate {
  title?: string
  description?: string | null
  ticket_type?: string
  priority?: string
  assignee_id?: string | null
  epic_id?: string | null
  sprint_id?: string | null
  story_points?: number | null
  due_date?: string | null
  start_date?: string | null
  resolution?: string | null
}

export async function listTickets(projectId: string, params: TicketListParams = {}) {
  const { data } = await apiClient.get<PaginatedResponse<Ticket>>(`/projects/${projectId}/tickets`, { params })
  return data
}

export async function getTicket(ticketId: string) {
  const { data } = await apiClient.get<Ticket>(`/tickets/${ticketId}`)
  return data
}

export async function createTicket(projectId: string, payload: TicketCreate) {
  const { data } = await apiClient.post<Ticket>(`/projects/${projectId}/tickets`, payload)
  return data
}

export async function updateTicket(ticketId: string, payload: TicketUpdate) {
  const { data } = await apiClient.patch<Ticket>(`/tickets/${ticketId}`, payload)
  return data
}

export async function deleteTicket(ticketId: string) {
  await apiClient.delete(`/tickets/${ticketId}`)
}

export async function transitionStatus(ticketId: string, payload: { workflow_status_id: string; resolution?: string }) {
  const { data } = await apiClient.post<Ticket>(`/tickets/${ticketId}/transition`, payload)
  return data
}

export async function getTicketChildren(ticketId: string) {
  const { data } = await apiClient.get<Ticket[]>(`/tickets/${ticketId}/children`)
  return data
}

export async function bulkUpdateTickets(projectId: string, payload: { ticket_ids: string[]; [key: string]: unknown }) {
  const { data } = await apiClient.post<Ticket[]>(`/projects/${projectId}/tickets/bulk`, payload)
  return data
}

export async function searchTickets(projectId: string, q: string, offset = 0, limit = 50) {
  const { data } = await apiClient.get<PaginatedResponse<Ticket>>(`/projects/${projectId}/tickets/search`, { params: { q, offset, limit } })
  return data
}

export async function exportTicketsCsv(projectId: string): Promise<void> {
  const response = await apiClient.get(`/projects/${projectId}/tickets/export`, {
    responseType: 'blob',
  })
  const blob = new Blob([response.data as BlobPart], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `tickets_${projectId}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
