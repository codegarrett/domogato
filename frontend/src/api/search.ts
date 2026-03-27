import apiClient from './client'

export interface SearchResult {
  type: string
  id: string
  title: string
  subtitle: string | null
  highlight: string | null
  url: string
  project_id: string | null
  updated_at: string | null
}

export interface SearchResponse {
  results: SearchResult[]
  total: number
}

export async function globalSearch(
  q: string,
  opts?: { types?: string; project_id?: string; limit?: number },
): Promise<SearchResponse> {
  const params: Record<string, string | number> = { q }
  if (opts?.types) params.types = opts.types
  if (opts?.project_id) params.project_id = opts.project_id
  if (opts?.limit) params.limit = opts.limit
  const { data } = await apiClient.get<SearchResponse>('/search', { params })
  return data
}
