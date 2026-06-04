import { defineStore } from 'pinia'

import { ref, computed } from 'vue'

import {

  fetchAIConfig,

  listConversations,

  getConversation,

  deleteConversation as apiDeleteConversation,

  createConversation,

  uploadConversationAttachment,

  deleteConversationAttachment,

  sendChatMessage,

  type AIConfig,

  type AIAttachment,

  type Conversation,

  type Message,

  type SSEEvent,

  parseApprovalInteraction,

  parseChoiceInteraction,

} from '@/api/ai'

import { getLocale } from '@/i18n'



export const useChatStore = defineStore('chat', () => {

  const aiConfig = ref<AIConfig | null>(null)

  const conversations = ref<Conversation[]>([])

  const activeConversationId = ref<string | null>(null)

  const messages = ref<Message[]>([])

  const pendingAttachments = ref<AIAttachment[]>([])

  const isUploadingAttachment = ref(false)

  const streamingContent = ref('')

  const streamingReasoning = ref('')

  const activeToolCall = ref<{ name: string; arguments?: Record<string, unknown> } | null>(null)

  const isStreaming = ref(false)

  const isOpen = ref(false)

  const isLoading = ref(false)

  const view = ref<'list' | 'chat'>('list')

  let shouldReloadAfterStream = false



  const isConfigured = computed(() => aiConfig.value?.is_configured ?? false)



  async function loadConfig() {

    try {

      aiConfig.value = await fetchAIConfig()

    } catch {

      aiConfig.value = null

    }

  }



  async function loadConversations() {

    isLoading.value = true

    try {

      const result = await listConversations(0, 50)

      conversations.value = result.items

    } catch {

      conversations.value = []

    } finally {

      isLoading.value = false

    }

  }



  async function openConversation(id: string) {

    isLoading.value = true

    activeConversationId.value = id

    pendingAttachments.value = []

    view.value = 'chat'

    try {

      const detail = await getConversation(id)

      messages.value = detail.messages

    } catch {

      messages.value = []

    } finally {

      isLoading.value = false

    }

  }



  function newConversation() {

    activeConversationId.value = null

    messages.value = []

    pendingAttachments.value = []

    streamingContent.value = ''

    streamingReasoning.value = ''

    view.value = 'chat'

  }



  function goToList() {

    view.value = 'list'

    activeConversationId.value = null

    messages.value = []

    pendingAttachments.value = []

    streamingContent.value = ''

    streamingReasoning.value = ''

  }



  async function ensureConversation(): Promise<string> {

    if (activeConversationId.value) {

      return activeConversationId.value

    }

    const conversation = await createConversation()

    activeConversationId.value = conversation.id

    return conversation.id

  }



  async function addAttachment(file: File) {

    if (isUploadingAttachment.value || isStreaming.value) return

    isUploadingAttachment.value = true

    try {

      const conversationId = await ensureConversation()

      const attachment = await uploadConversationAttachment(conversationId, file)

      pendingAttachments.value.push(attachment)

    } finally {

      isUploadingAttachment.value = false

    }

  }



  async function removeAttachment(attachmentId: string) {

    const attachment = pendingAttachments.value.find((a) => a.id === attachmentId)

    if (!attachment || !activeConversationId.value) return

    try {

      await deleteConversationAttachment(activeConversationId.value, attachmentId)

      pendingAttachments.value = pendingAttachments.value.filter((a) => a.id !== attachmentId)

    } catch {

      // handled by api client interceptor

    }

  }



  async function respondToChoice(option: string) {
    const pending = [...messages.value].reverse().find((m) => {
      if (m.role !== 'interaction') return false
      const data = parseChoiceInteraction(m.content)
      return data?.status === 'pending'
    })

    if (pending) {
      const data = parseChoiceInteraction(pending.content)
      if (data) {
        data.status = 'answered'
        data.selected_option = option
        data.decided_at = new Date().toISOString()
        pending.content = JSON.stringify(data)
      }
    }

    shouldReloadAfterStream = true
    await sendMessage(option)
  }

  async function respondToApproval(approved: boolean) {

    const text = approved ? 'Yes, go ahead' : 'No, cancel that'

    const pending = [...messages.value].reverse().find((m) => {

      if (m.role !== 'interaction') return false

      const data = parseApprovalInteraction(m.content)

      return data?.status === 'pending'

    })

    if (pending) {

      const data = parseApprovalInteraction(pending.content)

      if (data) {

        data.status = approved ? 'approved' : 'rejected'

        data.decided_at = new Date().toISOString()

        pending.content = JSON.stringify(data)

      }

    }

    shouldReloadAfterStream = true

    await sendMessage(text)

  }



  async function sendMessage(content: string) {

    const trimmed = content.trim()

    const hasAttachments = pendingAttachments.value.length > 0

    if (isStreaming.value || (!trimmed && !hasAttachments)) return

    const attachmentSnapshot = [...pendingAttachments.value]

    const attachmentIds = attachmentSnapshot.map((a) => a.id)

    const messageText = trimmed || '(attached files)'



    const userMessage: Message = {

      id: crypto.randomUUID(),

      role: 'user',

      content: messageText,

      model: null,

      prompt_tokens: null,

      completion_tokens: null,

      tool_calls: null,

      created_at: new Date().toISOString(),

      attachments: attachmentSnapshot,

    }

    messages.value.push(userMessage)

    pendingAttachments.value = []



    isStreaming.value = true

    streamingContent.value = ''

    streamingReasoning.value = ''



    try {

      await sendChatMessage(

        activeConversationId.value,

        messageText,

        attachmentIds,

        getLocale(),

        (event: SSEEvent) => {

          switch (event.type) {

            case 'conversation':

              if (event.conversation_id) {

                activeConversationId.value = event.conversation_id

              }

              break

            case 'reasoning':

              if (event.content) {

                streamingReasoning.value += event.content

              }

              break

            case 'tool_start':

              activeToolCall.value = {

                name: event.name || '',

                arguments: event.arguments,

              }

              break

            case 'tool_result':

              activeToolCall.value = null

              break

            case 'choice_request':
              messages.value.push({
                id: crypto.randomUUID(),
                role: 'interaction',
                content: JSON.stringify({
                  type: 'choice',
                  status: 'pending',
                  question: event.question || '',
                  options: event.options || [],
                }),
                model: null,
                prompt_tokens: null,
                completion_tokens: null,
                tool_calls: null,
                created_at: new Date().toISOString(),
              })
              shouldReloadAfterStream = true
              break

            case 'approval_request':

              messages.value.push({

                id: crypto.randomUUID(),

                role: 'interaction',

                content: JSON.stringify({

                  type: 'approval',

                  status: 'pending',

                  action: event.action || '',

                  details: event.details || {},

                }),

                model: null,

                prompt_tokens: null,

                completion_tokens: null,

                tool_calls: null,

                created_at: new Date().toISOString(),

              })

              shouldReloadAfterStream = true

              break

            case 'chunk':

              if (event.content) {

                streamingContent.value += event.content

              }

              break

            case 'done': {

              const assistantMessage: Message = {

                id: event.message_id || crypto.randomUUID(),

                role: 'assistant',

                content: streamingContent.value,

                model: event.model || null,

                prompt_tokens: event.prompt_tokens || null,

                completion_tokens: event.completion_tokens || null,

                tool_calls: null,

                created_at: new Date().toISOString(),

              }

              messages.value.push(assistantMessage)

              streamingContent.value = ''

              streamingReasoning.value = ''

              activeToolCall.value = null

              break

            }

            case 'error':

              streamingContent.value = ''

              streamingReasoning.value = ''

              activeToolCall.value = null

              break

          }

        },

      )

    } catch {

      streamingContent.value = ''

      streamingReasoning.value = ''

    } finally {

      isStreaming.value = false

      if (shouldReloadAfterStream && activeConversationId.value) {

        shouldReloadAfterStream = false

        try {

          const detail = await getConversation(activeConversationId.value)

          messages.value = detail.messages

        } catch {

          // keep optimistic messages

        }

      }

      loadConversations()

    }

  }



  async function deleteConversation(id: string) {

    try {

      await apiDeleteConversation(id)

      conversations.value = conversations.value.filter((c) => c.id !== id)

      if (activeConversationId.value === id) {

        goToList()

      }

    } catch {

      // handled by api client interceptor

    }

  }



  function toggle() {

    isOpen.value = !isOpen.value

    if (isOpen.value && aiConfig.value === null) {

      loadConfig()

    }

    if (isOpen.value) {

      loadConversations()

    }

  }



  return {

    aiConfig,

    conversations,

    activeConversationId,

    messages,

    pendingAttachments,

    isUploadingAttachment,

    streamingContent,

    streamingReasoning,

    activeToolCall,

    isStreaming,

    isOpen,

    isLoading,

    view,

    isConfigured,

    loadConfig,

    loadConversations,

    openConversation,

    newConversation,

    goToList,

    ensureConversation,

    addAttachment,

    removeAttachment,

    sendMessage,

    respondToApproval,

    respondToChoice,

    deleteConversation,

    toggle,

  }

})

