import apiClient from './client'
import { uploadFile } from '@/utils/files'
import type { PaginatedResponse } from '@/types/api'

export interface UserRead {
  id: string
  email: string
  display_name: string
  avatar_url: string | null
  is_system_admin: boolean
  is_active: boolean
  preferences: Record<string, unknown>
  last_login_at: string | null
  created_at: string
  updated_at: string
}

export interface AccountUrls {
  account_url: string
  security_url: string
  password_url: string
  sessions_url: string
}

export async function updateCurrentUser(payload: {
  display_name?: string
  avatar_url?: string | null
  preferences?: Record<string, unknown>
}) {
  const { data } = await apiClient.patch<UserRead>('/users/me', payload)
  return data
}

export async function uploadAvatar(file: File): Promise<{ avatar_url: string }> {
  return uploadFile<{ avatar_url: string }>('/users/me/avatar', file)
}

export async function deleteAvatar() {
  await apiClient.delete('/users/me/avatar')
}

export async function getAccountUrls() {
  const { data } = await apiClient.get<AccountUrls>('/auth/account-url')
  return data
}

export interface UserSearchResult {
  id: string
  email: string
  display_name: string
  avatar_url: string | null
}

export async function searchUsers(q: string, limit = 20) {
  const { data } = await apiClient.get<UserSearchResult[]>('/users/search', {
    params: { q, limit },
  })
  return data
}

export async function listUsers(offset = 0, limit = 50, q?: string) {
  const { data } = await apiClient.get<PaginatedResponse<UserRead>>('/users', {
    params: { offset, limit, q },
  })
  return data
}

export async function getUser(userId: string) {
  const { data } = await apiClient.get<UserRead>(`/users/${userId}`)
  return data
}

export async function adminUpdateUser(userId: string, payload: { is_active?: boolean; is_system_admin?: boolean }) {
  const { data } = await apiClient.patch<UserRead>(`/users/${userId}`, payload)
  return data
}

export async function adminCreateUser(payload: {
  email: string
  password: string
  display_name: string
  is_system_admin?: boolean
}) {
  const { data } = await apiClient.post<UserRead>('/users', payload)
  return data
}
