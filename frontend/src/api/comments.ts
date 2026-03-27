import apiClient from './client'
import type { PaginatedResponse } from '@/types/api'

export interface Comment {
  id: string
  ticket_id: string
  author_id: string | null
  body: string
  is_edited: boolean
  is_deleted: boolean
  created_at: string
  updated_at: string
  author_name: string | null
  author_email: string | null
}

export async function listComments(ticketId: string, offset = 0, limit = 50) {
  const { data } = await apiClient.get<PaginatedResponse<Comment>>(`/tickets/${ticketId}/comments`, { params: { offset, limit } })
  return data
}

export async function createComment(ticketId: string, body: string) {
  const { data } = await apiClient.post<Comment>(`/tickets/${ticketId}/comments`, { body })
  return data
}

export async function updateComment(commentId: string, body: string) {
  const { data } = await apiClient.patch<Comment>(`/comments/${commentId}`, { body })
  return data
}

export async function deleteComment(commentId: string) {
  await apiClient.delete(`/comments/${commentId}`)
}
