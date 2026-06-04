import apiClient from '@/api/client'

import { useAuth } from '@/composables/useAuth'

import { uploadFile } from '@/utils/files'



export interface SkillInfo {

  name: string

  description: string

  category: string

}



export interface AIConfig {

  is_configured: boolean

  provider: string | null

  model: string | null

  embedding_configured: boolean

  embedding_provider: string | null

  embedding_model: string | null

  vision_enabled: boolean

  available_skills: SkillInfo[]

}



export interface Conversation {

  id: string

  title: string | null

  model: string | null

  message_count: number

  is_archived: boolean

  created_at: string

  updated_at: string

}



export interface AIAttachment {

  id: string

  conversation_id: string

  filename: string

  content_type: string

  size_bytes: number

  message_id: string | null

  promoted_to_type: string | null

  created_at: string

}



export interface Message {

  id: string

  role: 'system' | 'user' | 'assistant' | 'tool' | 'interaction'

  content: string

  model: string | null

  prompt_tokens: number | null

  completion_tokens: number | null

  tool_calls: Record<string, unknown>[] | Record<string, unknown> | null

  created_at: string

  attachments?: AIAttachment[]

}



export interface ApprovalInteraction {

  type: 'approval'

  status: 'pending' | 'approved' | 'rejected'

  action: string

  details?: Record<string, unknown>

  decided_at?: string

}



export interface ChoiceInteraction {

  type: 'choice'

  status: 'pending' | 'answered'

  question: string

  options: string[]

  selected_option?: string

  decided_at?: string

}



export function parseApprovalInteraction(content: string): ApprovalInteraction | null {

  try {

    const data = JSON.parse(content) as ApprovalInteraction

    if (data.type === 'approval') return data

  } catch {

    // not JSON

  }

  return null

}



export function parseChoiceInteraction(content: string): ChoiceInteraction | null {

  try {

    const data = JSON.parse(content) as ChoiceInteraction

    if (data.type === 'choice') return data

  } catch {

    // not JSON

  }

  return null

}



export interface ConversationDetail extends Conversation {

  messages: Message[]

}



export interface ConversationList {

  items: Conversation[]

  total: number

  offset: number

  limit: number

}



export interface SSEEvent {

  type:

    | 'conversation'

    | 'chunk'

    | 'reasoning'

    | 'done'

    | 'error'

    | 'tool_start'

    | 'tool_result'

    | 'choice_request'

    | 'approval_request'

    | 'debug'

  conversation_id?: string

  content?: string

  message_id?: string

  model?: string

  prompt_tokens?: number

  completion_tokens?: number

  message?: string

  name?: string

  arguments?: Record<string, unknown>

  summary?: string

  question?: string

  options?: string[]

  action?: string

  details?: Record<string, unknown>

  timestamp?: string

  event?: string

  data?: Record<string, unknown>

}



export interface PendingInteraction {

  type: 'choice' | 'approval'

  question?: string

  options?: string[]

  action?: string

  details?: Record<string, unknown>

}



export async function fetchAIConfig(): Promise<AIConfig> {

  const response = await apiClient.get('/ai/config')

  return response.data

}



export async function createConversation(): Promise<Conversation> {

  const response = await apiClient.post('/ai/conversations')

  return response.data

}



export async function listConversations(

  offset = 0,

  limit = 20,

): Promise<ConversationList> {

  const response = await apiClient.get('/ai/conversations', {

    params: { offset, limit },

  })

  return response.data

}



export async function getConversation(id: string): Promise<ConversationDetail> {

  const response = await apiClient.get(`/ai/conversations/${id}`)

  return response.data

}



export async function deleteConversation(id: string): Promise<void> {

  await apiClient.delete(`/ai/conversations/${id}`)

}



export async function uploadConversationAttachment(

  conversationId: string,

  file: File,

): Promise<AIAttachment> {

  return uploadFile<AIAttachment>(

    `/ai/conversations/${conversationId}/attachments`,

    file,

  )

}



export async function deleteConversationAttachment(

  conversationId: string,

  attachmentId: string,

): Promise<void> {

  await apiClient.delete(

    `/ai/conversations/${conversationId}/attachments/${attachmentId}`,

  )

}



export function aiAttachmentDownloadPath(

  conversationId: string,

  attachmentId: string,

): string {

  return `/ai/conversations/${conversationId}/attachments/${attachmentId}/download`

}



export async function sendChatMessage(

  conversationId: string | null,

  message: string,

  attachmentIds: string[],

  locale: string,

  onEvent: (event: SSEEvent) => void,

): Promise<void> {

  const { accessToken } = useAuth()

  const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1'



  const response = await fetch(`${baseUrl}/ai/chat`, {

    method: 'POST',

    headers: {

      'Content-Type': 'application/json',

      Authorization: `Bearer ${accessToken.value ?? ''}`,

    },

    body: JSON.stringify({

      conversation_id: conversationId,

      message,

      attachment_ids: attachmentIds,

      locale,

    }),

  })



  if (!response.ok) {

    const data = await response.json().catch(() => ({}))

    throw new Error(data.detail || `HTTP ${response.status}`)

  }



  const reader = response.body!.getReader()

  const decoder = new TextDecoder()

  let buffer = ''



  while (true) {

    const { done, value } = await reader.read()

    if (done) break



    buffer += decoder.decode(value, { stream: true })



    const lines = buffer.split('\n')

    buffer = lines.pop() || ''



    for (const line of lines) {

      const trimmed = line.trim()

      if (!trimmed.startsWith('data: ')) continue



      try {

        const data = JSON.parse(trimmed.slice(6)) as SSEEvent

        onEvent(data)

      } catch {

        // skip malformed events

      }

    }

  }



  if (buffer.trim().startsWith('data: ')) {

    try {

      const data = JSON.parse(buffer.trim().slice(6)) as SSEEvent

      onEvent(data)

    } catch {

      // skip

    }

  }

}

