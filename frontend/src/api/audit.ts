import apiClient from './client'

export interface AuditEntry {
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

export interface AuditLogResponse {
  items: AuditEntry[]
  total: number
  offset: number
  limit: number
}

export async function getProjectAuditLog(
  projectId: string,
  params?: { offset?: number; limit?: number; action?: string; user_id?: string },
): Promise<AuditLogResponse> {
  const { data } = await apiClient.get<AuditLogResponse>(
    `/projects/${projectId}/audit-log`,
    { params },
  )
  return data
}
