import apiClient from './client'
import type { PaginatedResponse } from '@/types/api'
import type { Ticket } from './tickets'

export interface Sprint {
  id: string
  project_id: string
  name: string
  goal: string | null
  start_date: string | null
  end_date: string | null
  status: 'planning' | 'active' | 'completed'
  completed_at: string | null
  velocity: number | null
  created_at: string
  updated_at: string
}

export interface SprintStats {
  sprint: Sprint
  total_tickets: number
  completed_tickets: number
  total_story_points: number
  completed_story_points: number
}

export interface SprintCreate {
  name: string
  goal?: string
  start_date?: string
  end_date?: string
}

export interface SprintUpdate {
  name?: string
  goal?: string
  start_date?: string
  end_date?: string
}

export async function listSprints(projectId: string, params?: { offset?: number; limit?: number; status?: string }): Promise<PaginatedResponse<Sprint>> {
  const { data } = await apiClient.get<PaginatedResponse<Sprint>>(`/projects/${projectId}/sprints`, { params })
  return data
}

export async function createSprint(projectId: string, body: SprintCreate): Promise<Sprint> {
  const { data } = await apiClient.post<Sprint>(`/projects/${projectId}/sprints`, body)
  return data
}

export async function getSprintDetail(sprintId: string): Promise<SprintStats> {
  const { data } = await apiClient.get<SprintStats>(`/sprints/${sprintId}`)
  return data
}

export async function updateSprint(sprintId: string, body: SprintUpdate): Promise<Sprint> {
  const { data } = await apiClient.patch<Sprint>(`/sprints/${sprintId}`, body)
  return data
}

export async function deleteSprint(sprintId: string): Promise<void> {
  await apiClient.delete(`/sprints/${sprintId}`)
}

export async function startSprint(sprintId: string): Promise<Sprint> {
  const { data } = await apiClient.post<Sprint>(`/sprints/${sprintId}/start`)
  return data
}

export async function completeSprint(sprintId: string, moveIncompleteTo: string = 'backlog'): Promise<Sprint> {
  const { data } = await apiClient.post<Sprint>(`/sprints/${sprintId}/complete`, { move_incomplete_to: moveIncompleteTo })
  return data
}

export async function getBacklog(projectId: string, params?: { offset?: number; limit?: number }): Promise<PaginatedResponse<Ticket>> {
  const { data } = await apiClient.get<PaginatedResponse<Ticket>>(`/projects/${projectId}/backlog`, { params })
  return data
}

export async function reorderBacklog(projectId: string, ticketIds: string[]): Promise<void> {
  await apiClient.post(`/projects/${projectId}/backlog/reorder`, { ticket_ids: ticketIds })
}

export async function moveToSprint(projectId: string, ticketIds: string[], sprintId: string): Promise<{ moved: number }> {
  const { data } = await apiClient.post<{ moved: number }>(`/projects/${projectId}/backlog/move-to-sprint`, { ticket_ids: ticketIds, sprint_id: sprintId })
  return data
}
