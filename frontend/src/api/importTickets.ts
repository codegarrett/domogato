import apiClient from './client'

export interface ColumnMapping {
  source_column: string
  target_field: string | null
}

export interface ValueMapping {
  source_value: string
  target_value: string | null
}

export interface ImportOptions {
  create_labels: boolean
  create_sprints: boolean
  skip_resolved: boolean
}

export interface ImportAnalyzeResponse {
  import_session_id: string
  format: string
  total_rows: number
  columns: string[]
  suggested_mappings: ColumnMapping[]
  unmapped_columns: string[]
  sample_rows: Record<string, unknown>[]
  unique_values: Record<string, string[]>
}

export interface ImportRowError {
  row_number: number
  external_key: string | null
  error: string
}

export interface ImportResult {
  total_processed: number
  tickets_created: number
  tickets_skipped: number
  labels_created: string[]
  sprints_created: string[]
  parent_links_resolved: number
  errors: ImportRowError[]
}

export async function analyzeImport(
  projectId: string,
  content: string,
  format: 'csv' | 'json',
): Promise<ImportAnalyzeResponse> {
  const { data } = await apiClient.post<ImportAnalyzeResponse>(
    `/projects/${projectId}/import/analyze`,
    { content, format },
  )
  return data
}

export async function executeImport(
  projectId: string,
  payload: {
    import_session_id: string
    column_mappings: ColumnMapping[]
    value_mappings: Record<string, ValueMapping[]>
    options: ImportOptions
  },
): Promise<ImportResult> {
  const { data } = await apiClient.post<ImportResult>(
    `/projects/${projectId}/import/execute`,
    payload,
  )
  return data
}
