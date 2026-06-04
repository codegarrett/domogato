import apiClient from './client'
import type { PaginatedResponse } from '@/types/api'

export interface ProjectEmbeddingCount {
  project_id: string
  project_name: string
  count: number
}

export interface EmbeddingStats {
  total_chunks: number
  unique_sources: number
  by_content_type: Record<string, number>
  by_project: ProjectEmbeddingCount[]
  embedding_configured: boolean
}

export interface EmbeddingListItem {
  id: string
  project_id: string | null
  project_name: string | null
  content_type: string
  content_id: string
  chunk_index: number
  chunk_text_preview: string
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface EmbeddingDetail extends Omit<EmbeddingListItem, 'chunk_text_preview'> {
  chunk_text: string
}

export interface SemanticSearchResult {
  id: string
  content_type: string
  content_id: string
  chunk_index: number
  chunk_text: string
  metadata: Record<string, unknown>
  similarity: number
}

export interface SemanticSearchResponse {
  query: string
  results: SemanticSearchResult[]
}

export interface ReindexResponse {
  pages_queued: number
  attachments_queued: number
  message: string | null
}

export interface DeleteEmbeddingsResponse {
  deleted: number
}

export interface EmbeddingListParams {
  offset?: number
  limit?: number
  project_id?: string
  content_type?: string
  q?: string
}

export async function getEmbeddingStats() {
  const { data } = await apiClient.get<EmbeddingStats>('/admin/embeddings/stats')
  return data
}

export async function listEmbeddings(params: EmbeddingListParams = {}) {
  const { data } = await apiClient.get<PaginatedResponse<EmbeddingListItem>>('/admin/embeddings', { params })
  return data
}

export async function getEmbedding(id: string) {
  const { data } = await apiClient.get<EmbeddingDetail>(`/admin/embeddings/${id}`)
  return data
}

export async function deleteEmbedding(id: string) {
  const { data } = await apiClient.delete<DeleteEmbeddingsResponse>(`/admin/embeddings/${id}`)
  return data
}

export async function deleteContentEmbeddings(contentType: string, contentId: string) {
  const { data } = await apiClient.delete<DeleteEmbeddingsResponse>('/admin/embeddings/content', {
    data: { content_type: contentType, content_id: contentId },
  })
  return data
}

export async function reindexContent(contentType: string, contentId: string) {
  const { data } = await apiClient.post<ReindexResponse>(
    `/admin/embeddings/content/${contentType}/${contentId}/reindex`,
  )
  return data
}

export async function reindexProject(projectId: string) {
  const { data } = await apiClient.post<ReindexResponse>(
    `/admin/embeddings/projects/${projectId}/reindex`,
  )
  return data
}

export async function semanticSearchEmbeddings(payload: {
  query: string
  project_id: string
  content_types?: string[]
  limit?: number
}) {
  const { data } = await apiClient.post<SemanticSearchResponse>(
    '/admin/embeddings/semantic-search',
    payload,
  )
  return data
}

export interface ProjectOption {
  id: string
  name: string
  key: string
  organization_id: string
}

export function sourceLabel(item: Pick<EmbeddingListItem, 'content_type' | 'metadata'>): string {
  const meta = item.metadata
  if (item.content_type === 'kb_attachment' && typeof meta.filename === 'string') {
    return meta.filename
  }
  if (typeof meta.page_title === 'string') {
    return meta.page_title
  }
  return item.content_type
}

export function kbPageRoute(
  projectId: string | null | undefined,
  metadata: Record<string, unknown>,
): string | null {
  if (!projectId) return null
  const spaceSlug = metadata.space_slug
  const pageSlug = metadata.page_slug
  if (typeof spaceSlug === 'string' && typeof pageSlug === 'string') {
    return `/projects/${projectId}/kb/${spaceSlug}/${pageSlug}`
  }
  return null
}
