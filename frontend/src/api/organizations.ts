import apiClient from './client'
import type { PaginatedResponse } from '@/types/api'

export interface Organization {
  id: string
  name: string
  slug: string
  description: string | null
  avatar_url: string | null
  settings: Record<string, unknown>
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface OrgMember {
  id: string
  user_id: string
  email: string
  display_name: string
  avatar_url: string | null
  role: string
  created_at: string
}

export async function listOrganizations(offset = 0, limit = 50) {
  const { data } = await apiClient.get<PaginatedResponse<Organization>>('/organizations', { params: { offset, limit } })
  return data
}

export async function getOrganization(orgId: string) {
  const { data } = await apiClient.get<Organization>(`/organizations/${orgId}`)
  return data
}

export async function createOrganization(payload: { name: string; slug?: string; description?: string }) {
  const { data } = await apiClient.post<Organization>('/organizations', payload)
  return data
}

export async function updateOrganization(orgId: string, payload: Record<string, unknown>) {
  const { data } = await apiClient.patch<Organization>(`/organizations/${orgId}`, payload)
  return data
}

export async function deleteOrganization(orgId: string) {
  await apiClient.delete(`/organizations/${orgId}`)
}

export async function listOrgMembers(orgId: string, offset = 0, limit = 50) {
  const { data } = await apiClient.get<PaginatedResponse<OrgMember>>(`/organizations/${orgId}/members`, { params: { offset, limit } })
  return data
}

export async function addOrgMember(orgId: string, payload: { user_id?: string; email?: string; role?: string }) {
  const { data } = await apiClient.post<OrgMember>(`/organizations/${orgId}/members`, payload)
  return data
}

export async function updateOrgMemberRole(orgId: string, userId: string, role: string) {
  const { data } = await apiClient.patch<OrgMember>(`/organizations/${orgId}/members/${userId}`, { role })
  return data
}

export async function removeOrgMember(orgId: string, userId: string) {
  await apiClient.delete(`/organizations/${orgId}/members/${userId}`)
}
