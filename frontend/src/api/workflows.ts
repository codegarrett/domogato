import apiClient from './client'
import type { PaginatedResponse } from '@/types/api'

export interface WorkflowStatus {
  id: string
  workflow_id: string
  name: string
  category: 'to_do' | 'in_progress' | 'done'
  color: string
  position: number
  is_initial: boolean
  is_terminal: boolean
  created_at: string
  updated_at: string
}

export interface WorkflowTransition {
  id: string
  workflow_id: string
  from_status_id: string
  to_status_id: string
  name: string | null
  conditions: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface Workflow {
  id: string
  organization_id: string
  name: string
  description: string | null
  is_template: boolean
  is_active: boolean
  statuses: WorkflowStatus[]
  transitions: WorkflowTransition[]
  created_at: string
  updated_at: string
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

export async function listWorkflows(orgId: string, offset = 0, limit = 50) {
  const { data } = await apiClient.get<PaginatedResponse<Workflow>>(`/organizations/${orgId}/workflows`, { params: { offset, limit } })
  return data
}

export async function getWorkflow(workflowId: string) {
  const { data } = await apiClient.get<Workflow>(`/workflows/${workflowId}`)
  return data
}

export async function createWorkflow(orgId: string, payload: { name: string; description?: string; template_id?: string }) {
  const { data } = await apiClient.post<Workflow>(`/organizations/${orgId}/workflows`, payload)
  return data
}

export async function updateWorkflow(workflowId: string, payload: Record<string, unknown>) {
  const { data } = await apiClient.patch<Workflow>(`/workflows/${workflowId}`, payload)
  return data
}

export async function deleteWorkflow(workflowId: string) {
  await apiClient.delete(`/workflows/${workflowId}`)
}

export async function addStatus(workflowId: string, payload: { name: string; category?: string; color?: string; position?: number; is_initial?: boolean; is_terminal?: boolean }) {
  const { data } = await apiClient.post<WorkflowStatus>(`/workflows/${workflowId}/statuses`, payload)
  return data
}

export async function updateStatus(statusId: string, payload: Record<string, unknown>) {
  const { data } = await apiClient.patch<WorkflowStatus>(`/workflows/statuses/${statusId}`, payload)
  return data
}

export async function removeStatus(statusId: string) {
  await apiClient.delete(`/workflows/statuses/${statusId}`)
}

export async function addTransition(workflowId: string, payload: { from_status_id: string; to_status_id: string; name?: string }) {
  const { data } = await apiClient.post<WorkflowTransition>(`/workflows/${workflowId}/transitions`, payload)
  return data
}

export async function removeTransition(transitionId: string) {
  await apiClient.delete(`/workflows/transitions/${transitionId}`)
}

export async function validateWorkflow(workflowId: string) {
  const { data } = await apiClient.get<ValidationResult>(`/workflows/${workflowId}/validate`)
  return data
}

export async function seedDefaultWorkflows(orgId: string) {
  const { data } = await apiClient.post<Workflow[]>(`/organizations/${orgId}/workflows/seed`)
  return data
}
