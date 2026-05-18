import apiClient from './client'
import { uploadFile } from '@/utils/files'

export interface Attachment {
  id: string
  ticket_id: string
  project_id: string
  uploaded_by_id: string | null
  filename: string
  content_type: string
  size_bytes: number
  created_at: string
}

export async function uploadAttachment(ticketId: string, file: File): Promise<Attachment> {
  return uploadFile<Attachment>(`/tickets/${ticketId}/attachments`, file)
}

export async function listAttachments(
  ticketId: string,
  params?: { offset?: number; limit?: number },
): Promise<{ items: Attachment[]; total: number }> {
  const { data } = await apiClient.get<{ items: Attachment[]; total: number }>(
    `/tickets/${ticketId}/attachments`,
    { params },
  )
  return data
}

export async function deleteAttachment(attachmentId: string): Promise<void> {
  await apiClient.delete(`/attachments/${attachmentId}`)
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
