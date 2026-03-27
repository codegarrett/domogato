import apiClient from './client'

export interface SavedView {
  id: string
  user_id: string
  project_id: string | null
  name: string
  entity_type: string
  filters: Record<string, unknown>
  sort_by: string
  sort_dir: string
  columns: string[]
  is_default: boolean
  is_shared: boolean
  created_at: string
  updated_at: string
}

export interface SavedViewCreate {
  name: string
  entity_type?: string
  filters?: Record<string, unknown>
  sort_by?: string
  sort_dir?: string
  columns?: string[]
  is_default?: boolean
  is_shared?: boolean
}

export async function listSavedViews(projectId: string): Promise<SavedView[]> {
  const { data } = await apiClient.get<SavedView[]>(`/projects/${projectId}/views`)
  return data
}

export async function createSavedView(projectId: string, body: SavedViewCreate): Promise<SavedView> {
  const { data } = await apiClient.post<SavedView>(`/projects/${projectId}/views`, body)
  return data
}

export async function updateSavedView(viewId: string, body: Partial<SavedViewCreate>): Promise<SavedView> {
  const { data } = await apiClient.put<SavedView>(`/views/${viewId}`, body)
  return data
}

export async function deleteSavedView(viewId: string): Promise<void> {
  await apiClient.delete(`/views/${viewId}`)
}
