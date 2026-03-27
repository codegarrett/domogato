import apiClient from './client'
import type { PaginatedResponse } from '@/types/api'

export interface Notification {
  id: string
  user_id: string
  event_type: string
  title: string
  body: string | null
  entity_type: string | null
  entity_id: string | null
  data: Record<string, unknown>
  is_read: boolean
  read_at: string | null
  created_at: string
}

export async function listNotifications(params?: {
  offset?: number
  limit?: number
  unread_only?: boolean
}): Promise<PaginatedResponse<Notification>> {
  const { data } = await apiClient.get<PaginatedResponse<Notification>>('/notifications', { params })
  return data
}

export async function getUnreadCount(): Promise<number> {
  const { data } = await apiClient.get<{ unread_count: number }>('/notifications/unread-count')
  return data.unread_count
}

export async function markAsRead(notificationId: string): Promise<void> {
  await apiClient.post(`/notifications/${notificationId}/read`)
}

export async function markAllRead(): Promise<{ marked_read: number }> {
  const { data } = await apiClient.post<{ marked_read: number }>('/notifications/read-all')
  return data
}
