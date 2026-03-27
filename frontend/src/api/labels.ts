import apiClient from './client'

export interface Label {
  id: string
  project_id: string
  name: string
  color: string
  description: string | null
  created_at: string
  updated_at: string
}

export async function listLabels(projectId: string) {
  const { data } = await apiClient.get<Label[]>(`/projects/${projectId}/labels`)
  return data
}

export async function listTicketLabels(ticketId: string) {
  const { data } = await apiClient.get<Label[]>(`/tickets/${ticketId}/labels`)
  return data
}

export async function createLabel(projectId: string, payload: { name: string; color?: string; description?: string }) {
  const { data } = await apiClient.post<Label>(`/projects/${projectId}/labels`, payload)
  return data
}

export async function updateLabel(labelId: string, payload: { name?: string; color?: string; description?: string }) {
  const { data } = await apiClient.patch<Label>(`/labels/${labelId}`, payload)
  return data
}

export async function deleteLabel(labelId: string) {
  await apiClient.delete(`/labels/${labelId}`)
}

export async function addLabelToTicket(ticketId: string, labelId: string) {
  await apiClient.post(`/tickets/${ticketId}/labels/${labelId}`)
}

export async function removeLabelFromTicket(ticketId: string, labelId: string) {
  await apiClient.delete(`/tickets/${ticketId}/labels/${labelId}`)
}
