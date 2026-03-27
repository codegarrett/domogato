import apiClient from './client'
import type { PaginatedResponse } from '@/types/api'

export interface Epic {
  id: string
  project_id: string
  title: string
  description: string | null
  status: string
  color: string
  start_date: string | null
  target_date: string | null
  sort_order: string
  created_by_id: string | null
  created_at: string
  updated_at: string
  ticket_count: number | null
  progress: Record<string, unknown> | null
}

export interface EpicCreate {
  title: string
  description?: string | null
  status?: string
  color?: string
  start_date?: string | null
  target_date?: string | null
}

export interface EpicUpdate {
  title?: string
  description?: string | null
  status?: string
  color?: string
  start_date?: string | null
  target_date?: string | null
}

export async function listEpics(projectId: string, offset = 0, limit = 50) {
  const { data } = await apiClient.get<PaginatedResponse<Epic>>(`/projects/${projectId}/epics`, { params: { offset, limit } })
  return data
}

export async function getEpic(epicId: string) {
  const { data } = await apiClient.get<Epic>(`/epics/${epicId}`)
  return data
}

export async function createEpic(projectId: string, payload: EpicCreate) {
  const { data } = await apiClient.post<Epic>(`/projects/${projectId}/epics`, payload)
  return data
}

export async function updateEpic(epicId: string, payload: EpicUpdate) {
  const { data } = await apiClient.patch<Epic>(`/epics/${epicId}`, payload)
  return data
}

export async function deleteEpic(epicId: string) {
  await apiClient.delete(`/epics/${epicId}`)
}
