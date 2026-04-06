import apiClient from './client'
import type { PaginatedResponse } from '@/types/api'

export interface Project {
  id: string
  organization_id: string
  name: string
  key: string
  description: string | null
  avatar_url: string | null
  visibility: string
  default_workflow_id: string | null
  ticket_sequence: number
  settings: Record<string, unknown>
  is_archived: boolean
  created_at: string
  updated_at: string
}

export interface ProjectMember {
  id: string
  user_id: string
  email: string
  display_name: string
  avatar_url: string | null
  role: string
  created_at: string
}

export async function listProjects(orgId: string, offset = 0, limit = 50) {
  const { data } = await apiClient.get<PaginatedResponse<Project>>(`/organizations/${orgId}/projects`, { params: { offset, limit } })
  return data
}

export async function getProject(projectId: string) {
  const { data } = await apiClient.get<Project>(`/projects/${projectId}`)
  return data
}

export async function createProject(orgId: string, payload: { name: string; key: string; description?: string; visibility?: string }) {
  const { data } = await apiClient.post<Project>(`/organizations/${orgId}/projects`, payload)
  return data
}

export async function updateProject(projectId: string, payload: Record<string, unknown>) {
  const { data } = await apiClient.patch<Project>(`/projects/${projectId}`, payload)
  return data
}

export async function archiveProject(projectId: string) {
  await apiClient.post(`/projects/${projectId}/archive`)
}

export async function unarchiveProject(projectId: string) {
  await apiClient.post(`/projects/${projectId}/unarchive`)
}

export async function listProjectMembers(projectId: string, offset = 0, limit = 50) {
  const { data } = await apiClient.get<PaginatedResponse<ProjectMember>>(`/projects/${projectId}/members`, { params: { offset, limit } })
  return data
}

export async function addProjectMember(projectId: string, payload: { user_id?: string; email?: string; role?: string }) {
  const { data } = await apiClient.post<ProjectMember>(`/projects/${projectId}/members`, payload)
  return data
}

export async function updateProjectMemberRole(projectId: string, userId: string, role: string) {
  const { data } = await apiClient.patch<ProjectMember>(`/projects/${projectId}/members/${userId}`, { role })
  return data
}

export async function removeProjectMember(projectId: string, userId: string) {
  await apiClient.delete(`/projects/${projectId}/members/${userId}`)
}

export interface ProjectSettings {
  auto_add_org_members: boolean
  api_key: string | null
}

export async function getProjectSettings(projectId: string) {
  const { data } = await apiClient.get<ProjectSettings>(`/projects/${projectId}/settings`)
  return data
}

export async function updateProjectSettings(projectId: string, settings: Partial<ProjectSettings>) {
  const { data } = await apiClient.patch<ProjectSettings>(`/projects/${projectId}/settings`, settings)
  return data
}

export async function generateProjectApiKey(projectId: string) {
  const { data } = await apiClient.post<ProjectSettings>(`/projects/${projectId}/settings/api-key`)
  return data
}

export async function revokeProjectApiKey(projectId: string) {
  await apiClient.delete(`/projects/${projectId}/settings/api-key`)
}
