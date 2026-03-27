import apiClient from './client'

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

export interface AttachmentCreate {
  filename: string
  content_type: string
  size_bytes: number
}

export interface AttachmentPresignResponse {
  attachment: Attachment
  upload_url: string
}

export interface AttachmentDownloadResponse {
  download_url: string
}

export async function createAttachment(
  ticketId: string,
  body: AttachmentCreate,
): Promise<AttachmentPresignResponse> {
  const { data } = await apiClient.post<AttachmentPresignResponse>(
    `/tickets/${ticketId}/attachments`,
    body,
  )
  return data
}

export async function uploadToPresignedUrl(
  uploadUrl: string,
  file: File,
): Promise<void> {
  await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type },
  })
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

export async function getDownloadUrl(attachmentId: string): Promise<string> {
  const { data } = await apiClient.get<AttachmentDownloadResponse>(
    `/attachments/${attachmentId}/download`,
  )
  return data.download_url
}

export async function deleteAttachment(attachmentId: string): Promise<void> {
  await apiClient.delete(`/attachments/${attachmentId}`)
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
