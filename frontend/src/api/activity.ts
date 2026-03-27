import apiClient from './client'
import type { PaginatedResponse } from '@/types/api'

export interface ActivityLog {
  id: string
  ticket_id: string
  user_id: string | null
  user_name: string | null
  action: string
  field_name: string | null
  old_value: string | null
  new_value: string | null
  metadata_json: Record<string, unknown>
  created_at: string
}

export async function listActivity(ticketId: string, offset = 0, limit = 50) {
  const { data } = await apiClient.get<PaginatedResponse<ActivityLog>>(`/tickets/${ticketId}/activity`, { params: { offset, limit } })
  return data
}
