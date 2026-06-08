import apiClient from './client'

export type ContentAssistContext =
  | 'ticket_create'
  | 'ticket_edit'
  | 'issue_create'
  | 'issue_edit'
  | 'issue_me_too'
  | 'ticket_from_reports'
  | 'user_story_create'
  | 'user_story_refine'

export type ContentFormat = 'markdown' | 'plain'

export interface ContentAssistGenerateRequest {
  context: ContentAssistContext
  prompt: string
  project_id?: string | null
  current_fields?: Record<string, unknown> | null
  reference_items?: Array<Record<string, unknown>> | null
}

export interface ContentAssistGenerateResponse {
  title?: string | null
  description?: string | null
  ticket_type?: string | null
  priority?: string | null
  story_points?: number | null
  source_url?: string | null
  story_title?: string | null
  story_body?: string | null
  story_acceptance_criteria?: string | null
}

export interface ContentAssistTranslateRequest {
  text: string
  target_locale: 'en' | 'es'
  content_format: ContentFormat
}

export interface ContentAssistTranslateResponse {
  translated_text: string
}

export async function generateContentAssist(
  payload: ContentAssistGenerateRequest,
): Promise<ContentAssistGenerateResponse> {
  const { data } = await apiClient.post<ContentAssistGenerateResponse>(
    '/ai/assist/generate',
    payload,
  )
  return data
}

export async function translateContentAssist(
  payload: ContentAssistTranslateRequest,
): Promise<ContentAssistTranslateResponse> {
  const { data } = await apiClient.post<ContentAssistTranslateResponse>(
    '/ai/assist/translate',
    payload,
  )
  return data
}
