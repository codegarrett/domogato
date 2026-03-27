import apiClient from './client'
import type { PaginatedResponse } from '@/types/api'

export interface Webhook {
  id: string
  project_id: string
  name: string
  url: string
  events: string[]
  is_active: boolean
  consecutive_failures: number
  created_at: string
  updated_at: string
}

export interface WebhookCreate {
  name: string
  url: string
  secret?: string
  events?: string[]
}

export interface WebhookUpdate {
  name?: string
  url?: string
  secret?: string
  events?: string[]
  is_active?: boolean
}

export interface WebhookDelivery {
  id: string
  webhook_id: string
  event_type: string
  payload: Record<string, unknown>
  response_status: number | null
  response_body: string | null
  duration_ms: number | null
  success: boolean
  attempt: number
  error_message: string | null
  created_at: string
}

export async function listWebhooks(projectId: string): Promise<Webhook[]> {
  const { data } = await apiClient.get<Webhook[]>(`/projects/${projectId}/webhooks`)
  return data
}

export async function createWebhook(projectId: string, body: WebhookCreate): Promise<Webhook> {
  const { data } = await apiClient.post<Webhook>(`/projects/${projectId}/webhooks`, body)
  return data
}

export async function getWebhook(webhookId: string): Promise<Webhook> {
  const { data } = await apiClient.get<Webhook>(`/webhooks/${webhookId}`)
  return data
}

export async function updateWebhook(webhookId: string, body: WebhookUpdate): Promise<Webhook> {
  const { data } = await apiClient.patch<Webhook>(`/webhooks/${webhookId}`, body)
  return data
}

export async function deleteWebhook(webhookId: string): Promise<void> {
  await apiClient.delete(`/webhooks/${webhookId}`)
}

export async function listDeliveries(
  webhookId: string,
  params?: { offset?: number; limit?: number },
): Promise<PaginatedResponse<WebhookDelivery>> {
  const { data } = await apiClient.get<PaginatedResponse<WebhookDelivery>>(
    `/webhooks/${webhookId}/deliveries`,
    { params },
  )
  return data
}

export async function testWebhook(webhookId: string): Promise<{ status: string }> {
  const { data } = await apiClient.post<{ status: string }>(
    `/webhooks/${webhookId}/test`,
    { event_type: 'test' },
  )
  return data
}
