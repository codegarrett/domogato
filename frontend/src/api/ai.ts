import apiClient from '@/api/client'
import { useAuth } from '@/composables/useAuth'

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

export interface Message {
  id: string
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  model: string | null
  prompt_tokens: number | null
  completion_tokens: number | null
  tool_calls: Record<string, unknown>[] | null
  created_at: string
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

export async function sendChatMessage(
  conversationId: string | null,
  message: string,
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
