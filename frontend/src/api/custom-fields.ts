import apiClient from './client'

export interface CustomFieldOption {
  id: string
  field_definition_id: string
  label: string
  color: string | null
  position: number
}

export interface CustomFieldDefinition {
  id: string
  project_id: string
  name: string
  field_type: 'text' | 'number' | 'date' | 'select' | 'multi_select' | 'user' | 'url' | 'checkbox'
  description: string | null
  is_required: boolean
  position: number
  validation_rules: Record<string, unknown>
  is_active: boolean
  options: CustomFieldOption[]
  created_at: string
  updated_at: string
}

export interface CustomFieldDefinitionCreate {
  name: string
  field_type: string
  description?: string
  is_required?: boolean
  validation_rules?: Record<string, unknown>
  options?: { label: string; color?: string; position?: number }[]
}

export interface CustomFieldDefinitionUpdate {
  name?: string
  description?: string
  is_required?: boolean
  validation_rules?: Record<string, unknown>
  is_active?: boolean
}

export interface CustomFieldValues {
  values: Record<string, unknown>
}

export async function listFieldDefinitions(projectId: string): Promise<CustomFieldDefinition[]> {
  const { data } = await apiClient.get<CustomFieldDefinition[]>(`/projects/${projectId}/custom-fields`)
  return data
}

export async function createFieldDefinition(projectId: string, body: CustomFieldDefinitionCreate): Promise<CustomFieldDefinition> {
  const { data } = await apiClient.post<CustomFieldDefinition>(`/projects/${projectId}/custom-fields`, body)
  return data
}

export async function updateFieldDefinition(fieldId: string, body: CustomFieldDefinitionUpdate): Promise<CustomFieldDefinition> {
  const { data } = await apiClient.patch<CustomFieldDefinition>(`/custom-fields/${fieldId}`, body)
  return data
}

export async function deleteFieldDefinition(fieldId: string): Promise<void> {
  await apiClient.delete(`/custom-fields/${fieldId}`)
}

export async function reorderFieldDefinitions(projectId: string, fieldIds: string[]): Promise<CustomFieldDefinition[]> {
  const { data } = await apiClient.put<CustomFieldDefinition[]>(`/projects/${projectId}/custom-fields/reorder`, fieldIds)
  return data
}

export async function addFieldOption(fieldId: string, body: { label: string; color?: string }): Promise<CustomFieldOption> {
  const { data } = await apiClient.post<CustomFieldOption>(`/custom-fields/${fieldId}/options`, body)
  return data
}

export async function removeFieldOption(optionId: string): Promise<void> {
  await apiClient.delete(`/custom-fields/options/${optionId}`)
}

export async function getTicketCustomFields(ticketId: string): Promise<CustomFieldValues> {
  const { data } = await apiClient.get<CustomFieldValues>(`/tickets/${ticketId}/custom-fields`)
  return data
}

export async function setTicketCustomFields(ticketId: string, values: Record<string, unknown>): Promise<CustomFieldValues> {
  const { data } = await apiClient.put<CustomFieldValues>(`/tickets/${ticketId}/custom-fields`, { values })
  return data
}
