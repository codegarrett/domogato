<template>
  <div class="chat-panel" :class="{ 'chat-panel--embedded': embedded }">
    <div class="chat-panel-shell">
    <div class="chat-panel-header">
      <Button
        v-if="chatStore.view === 'chat'"
        icon="pi pi-arrow-left"
        text
        size="small"
        :aria-label="$t('ai.back')"
        @click="chatStore.goToList()"
      />
      <span class="chat-panel-title">{{ $t('ai.assistant') }}</span>
      <Select
        v-model="chatLocale"
        :options="localeOptions"
        option-label="label"
        option-value="value"
        class="chat-locale-select"
        :aria-label="$t('ai.chatLanguage')"
        @change="onChatLocaleChange"
      />
      <Button
        v-if="authStore.isSystemAdmin && chatStore.view === 'chat'"
        icon="pi pi-code"
        text
        size="small"
        :aria-label="$t('ai.viewLogs')"
        @click="chatStore.openDebugLog()"
      />
      <Button
        v-if="chatStore.view === 'list'"
        icon="pi pi-plus"
        text
        size="small"
        :aria-label="$t('ai.newConversation')"
        @click="chatStore.newConversation()"
      />
    </div>

    <!-- Conversation list -->
    <div v-if="chatStore.view === 'list'" class="chat-flyout-list">
      <div v-if="chatStore.isLoading" class="chat-flyout-loading">
        <i class="pi pi-spin pi-spinner" />
      </div>
      <div v-else-if="chatStore.conversations.length === 0" class="chat-flyout-empty">
        {{ $t('ai.noConversations') }}
      </div>
      <div
        v-for="conv in chatStore.conversations"
        v-else
        :key="conv.id"
        class="chat-conv-item"
        @click="chatStore.openConversation(conv.id)"
      >
        <div class="chat-conv-item-body">
          <span class="chat-conv-title">{{ conv.title || 'Untitled' }}</span>
          <span class="chat-conv-meta">
            <span v-if="conv.model" class="chat-conv-model">{{ conv.model }}</span>
            <span class="chat-conv-time">{{ formatRelative(conv.updated_at) }}</span>
          </span>
        </div>
        <Button
          icon="pi pi-trash"
          text
          severity="danger"
          size="small"
          class="chat-conv-delete"
          @click.stop="chatStore.deleteConversation(conv.id)"
        />
      </div>
    </div>

    <!-- Active chat -->
    <div v-else class="chat-flyout-chat">
      <div ref="messagesContainer" class="chat-messages">
        <ChatWelcome
          v-if="showWelcome"
          :disabled="chatStore.isStreaming"
          @select="chatStore.sendMessage($event)"
        />
        <template v-for="msg in chatStore.messages" :key="msg.id">
          <!-- Hide assistant messages that only contain tool_calls (no visible content) -->
          <template v-if="msg.role === 'assistant' && msg.tool_calls && !msg.content">
            <!-- hidden: intermediate tool-call request -->
          </template>
          <!-- Approval interaction cards -->
          <ChatApprovalCard
            v-else-if="msg.role === 'interaction' && parseApproval(msg)"
            :interaction="parseApproval(msg)!"
            :disabled="chatStore.isStreaming"
            @approve="chatStore.respondToApproval(true)"
            @reject="chatStore.respondToApproval(false)"
          />
          <!-- Choice interaction cards -->
          <ChatChoiceCard
            v-else-if="msg.role === 'interaction' && parseChoice(msg)"
            :interaction="parseChoice(msg)!"
            :disabled="chatStore.isStreaming"
            show-other
            @select="chatStore.respondToChoice($event)"
          />
          <!-- Tool result messages: collapsible -->
          <div v-else-if="msg.role === 'tool' && !isApprovalToolMessage(msg)" class="chat-tool-result">
            <button class="chat-tool-result-toggle" @click="toggleToolResult(msg.id)">
              <i class="pi pi-wrench" />
              <span>{{ toolResultLabel(msg) }}</span>
              <i :class="expandedToolResults[msg.id] ? 'pi pi-chevron-down' : 'pi pi-chevron-right'" class="chat-tool-result-chevron" />
            </button>
            <pre v-if="expandedToolResults[msg.id]" class="chat-tool-result-data">{{ formatToolResult(msg.content) }}</pre>
          </div>
          <!-- Regular user/assistant messages -->
          <ChatMessage
            v-else-if="msg.role === 'user' || msg.role === 'assistant'"
            :role="msg.role"
            :content="msg.content"
            :created-at="msg.created_at"
            :conversation-id="chatStore.activeConversationId"
            :attachments="msg.attachments"
          />
        </template>
        <!-- Tool activity indicator -->
        <div v-if="chatStore.isStreaming && chatStore.activeToolCall" class="chat-tool-activity">
          <i class="pi pi-search" />
          <span>{{ toolDisplayName(chatStore.activeToolCall.name) }}</span>
          <span class="chat-thinking-dots"><span /><span /><span /></span>
        </div>
        <!-- Reasoning / thinking block -->
        <div v-if="chatStore.isStreaming && chatStore.streamingReasoning" class="chat-reasoning">
          <button class="chat-reasoning-toggle" @click="reasoningExpanded = !reasoningExpanded">
            <i :class="reasoningExpanded ? 'pi pi-chevron-down' : 'pi pi-chevron-right'" />
            <span class="chat-reasoning-label">{{ $t('ai.thinking') }}</span>
            <span class="chat-thinking-dots"><span /><span /><span /></span>
          </button>
          <div v-if="reasoningExpanded" class="chat-reasoning-content">
            {{ chatStore.streamingReasoning }}
          </div>
        </div>
        <!-- Streaming message -->
        <ChatMessage
          v-if="chatStore.streamingContent"
          role="assistant"
          :content="chatStore.streamingContent"
        />
        <!-- Initial thinking indicator before any tokens arrive -->
        <div v-if="chatStore.isStreaming && !chatStore.streamingContent && !chatStore.streamingReasoning" class="chat-thinking">
          <span class="chat-thinking-dots">
            <span /><span /><span />
          </span>
          {{ $t('ai.thinking') }}
        </div>
      </div>

      <ChatPendingActionBar
        v-if="pendingApprovalInteraction"
        :interaction="pendingApprovalInteraction"
        :disabled="chatStore.isStreaming"
        @approve="chatStore.respondToApproval(true)"
        @reject="chatStore.respondToApproval(false)"
      />
      <ChatPendingActionBar
        v-else-if="pendingChoiceInteraction"
        :interaction="pendingChoiceInteraction"
        :disabled="chatStore.isStreaming"
        @select="chatStore.respondToChoice($event)"
      />

      <ChatInput
        :disabled="chatStore.isStreaming"
        @send="chatStore.sendMessage($event)"
      />
    </div>
    <ChatDebugLogModal
      v-if="authStore.isSystemAdmin"
      v-model:visible="chatStore.debugLogOpen"
      :logs="chatStore.debugLogs"
      @clear="chatStore.clearDebugLogs()"
    />
    </div>
  </div>
</template>

<script setup lang="ts">
import { watch, ref, nextTick, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import Select from 'primevue/select'
import { useChatStore } from '@/stores/chat'
import { useAuthStore } from '@/stores/auth'
import { updateCurrentUser } from '@/api/users'
import { getLocale, setLocale } from '@/i18n'
import ChatMessage from '@/components/chat/ChatMessage.vue'
import ChatInput from '@/components/chat/ChatInput.vue'
import ChatApprovalCard from '@/components/chat/ChatApprovalCard.vue'
import ChatChoiceCard from '@/components/chat/ChatChoiceCard.vue'
import ChatPendingActionBar from '@/components/chat/ChatPendingActionBar.vue'
import ChatDebugLogModal from '@/components/chat/ChatDebugLogModal.vue'
import ChatWelcome from '@/components/chat/ChatWelcome.vue'
import { parseApprovalInteraction, parseChoiceInteraction, type ApprovalInteraction, type ChoiceInteraction, type Message } from '@/api/ai'

defineProps<{
  embedded?: boolean
}>()

const { t } = useI18n()
const chatStore = useChatStore()
const authStore = useAuthStore()
const messagesContainer = ref<HTMLElement>()
const reasoningExpanded = ref(true)

const localeOptions = [
  { label: 'English', value: 'en' },
  { label: 'Español', value: 'es' },
]

const chatLocale = ref<'en' | 'es'>(
  (getLocale() === 'es' ? 'es' : 'en'),
)

async function onChatLocaleChange() {
  setLocale(chatLocale.value)
  const existing = (authStore.currentUser?.preferences ?? {}) as Record<string, unknown>
  const prefs = { ...existing, locale: chatLocale.value }
  try {
    await updateCurrentUser({ preferences: prefs })
    if (authStore.currentUser) {
      authStore.currentUser = { ...authStore.currentUser, preferences: prefs }
    }
  } catch {
    // preferences sync is best-effort from chat; settings page remains source of truth
  }
}

const showWelcome = computed(
  () =>
    !chatStore.isLoading
    && chatStore.messages.length === 0
    && !chatStore.streamingContent
    && !chatStore.isStreaming,
)

const pendingApprovalInteraction = computed((): ApprovalInteraction | null => {
  for (let i = chatStore.messages.length - 1; i >= 0; i -= 1) {
    const msg = chatStore.messages[i]
    if (!msg || msg.role !== 'interaction') continue
    const data = parseApprovalInteraction(msg.content)
    if (data?.status === 'pending') return data
  }
  return null
})

const pendingChoiceInteraction = computed((): ChoiceInteraction | null => {
  if (pendingApprovalInteraction.value) return null
  for (let i = chatStore.messages.length - 1; i >= 0; i -= 1) {
    const msg = chatStore.messages[i]
    if (!msg || msg.role !== 'interaction') continue
    const data = parseChoiceInteraction(msg.content)
    if (data?.status === 'pending') return data
  }
  return null
})

const TOOL_DISPLAY_NAMES: Record<string, string> = {
  list_my_projects: 'ai.toolListProjects',
  search_tickets: 'ai.toolSearchTickets',
  get_ticket_details: 'ai.toolGetTicket',
  get_sprint_status: 'ai.toolSprintStatus',
  search_knowledge_base: 'ai.toolSearchKB',
  semantic_search_kb: 'ai.toolSemanticSearchKB',
  list_kb_spaces: 'ai.toolListKBSpaces',
  create_kb_page: 'ai.toolCreateKBPage',
  create_ticket: 'ai.toolCreateTicket',
  update_ticket: 'ai.toolUpdateTicket',
  transition_ticket_status: 'ai.toolTransitionStatus',
  get_ticket_transitions: 'ai.toolGetTransitions',
  search_issue_reports: 'ai.toolSearchIssueReports',
  create_issue_report: 'ai.toolCreateIssueReport',
  add_reporter_to_issue_report: 'ai.toolAddReporter',
  create_ticket_from_issue_reports: 'ai.toolCreateTicketFromReports',
  global_search: 'ai.toolGlobalSearch',
  get_my_dashboard: 'ai.toolGetDashboard',
  list_ticket_comments: 'ai.toolListComments',
  add_ticket_comment: 'ai.toolAddComment',
  watch_ticket: 'ai.toolWatchTicket',
  unwatch_ticket: 'ai.toolUnwatchTicket',
  list_conversation_attachments: 'ai.toolListAttachments',
  attach_file_to_ticket: 'ai.toolAttachToTicket',
  attach_file_to_issue_report: 'ai.toolAttachToIssueReport',
}

function toolDisplayName(name: string): string {
  const key = TOOL_DISPLAY_NAMES[name]
  return key ? t(key) : name.replace(/_/g, ' ')
}

function parseApproval(msg: Message): ApprovalInteraction | null {
  if (msg.role !== 'interaction') return null
  return parseApprovalInteraction(msg.content)
}

function parseChoice(msg: Message): ChoiceInteraction | null {
  if (msg.role !== 'interaction') return null
  return parseChoiceInteraction(msg.content)
}

function isApprovalToolMessage(msg: Message): boolean {
  const tc = msg.tool_calls as Record<string, unknown> | null
  return tc?.name === 'request_approval'
}

const expandedToolResults = ref<Record<string, boolean>>({})

function toggleToolResult(msgId: string) {
  expandedToolResults.value[msgId] = !expandedToolResults.value[msgId]
}

function toolResultLabel(msg: { tool_calls?: Record<string, unknown> | Record<string, unknown>[] | null; content: string }): string {
  const tc = msg.tool_calls as Record<string, unknown> | null
  const name = tc?.name as string | undefined
  if (name) {
    const displayKey = TOOL_DISPLAY_NAMES[name]
    const displayName = displayKey ? t(displayKey) : name.replace(/_/g, ' ')
    return displayName.replace(/\.{3}$/, '') + ' Result'
  }
  return 'Tool Result'
}

function formatToolResult(content: string): string {
  try {
    return JSON.stringify(JSON.parse(content), null, 2)
  } catch {
    return content
  }
}

function formatRelative(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

function scrollToBottom() {
  nextTick(() => {
    const el = messagesContainer.value
    if (el) {
      el.scrollTop = el.scrollHeight
    }
  })
}

watch(
  () => chatStore.messages.length,
  () => scrollToBottom(),
)

watch(
  () => chatStore.streamingContent,
  () => scrollToBottom(),
)

watch(
  () => chatStore.streamingReasoning,
  () => scrollToBottom(),
)

watch(
  () => chatStore.activeToolCall,
  () => scrollToBottom(),
)

watch(
  () => chatStore.isStreaming,
  (streaming) => {
    if (streaming) reasoningExpanded.value = true
  },
)

watch(
  () => chatStore.activeConversationId,
  () => {
    expandedToolResults.value = {}
  },
)
</script>

<style scoped>
.chat-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  font-size: 0.875rem;
}

.chat-panel-shell {
  position: relative;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  width: 100%;
}

.chat-panel--embedded {
  min-height: 100vh;
  align-items: center;
  background: var(--p-surface-ground, var(--p-surface-50));
}

.chat-panel--embedded .chat-panel-shell {
  max-width: 42rem;
  min-height: 100vh;
  background: var(--p-content-background, var(--p-surface-0));
  border-inline: 1px solid var(--p-content-border-color, var(--p-surface-200));
  box-shadow: 0 0 24px rgb(0 0 0 / 4%);
}

.chat-panel-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.75rem;
  border-bottom: 1px solid var(--p-content-border-color);
}

.chat-panel-title {
  flex: 1;
  font-weight: 600;
  font-size: 0.9375rem;
}

.chat-locale-select {
  width: 6.5rem;
  flex-shrink: 0;
}

.chat-locale-select :deep(.p-select-label) {
  font-size: 0.8125rem;
  padding-block: 0.375rem;
}

.chat-flyout-list {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
}

.chat-flyout-loading,
.chat-flyout-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: var(--p-text-muted-color);
  font-size: 0.875rem;
}

.chat-conv-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 0.75rem;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.12s;
}

.chat-conv-item:hover {
  background: var(--p-content-hover-background, var(--p-surface-100));
}

.chat-conv-item-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.chat-conv-title {
  font-size: 0.875rem;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--p-text-color);
}

.chat-conv-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
}

.chat-conv-model {
  background: var(--p-surface-ground, var(--p-surface-50));
  padding: 0 0.25rem;
  border-radius: 3px;
  font-weight: 600;
  font-size: 0.6875rem;
}

.chat-conv-delete {
  opacity: 0;
  transition: opacity 0.12s;
}

.chat-conv-item:hover .chat-conv-delete {
  opacity: 1;
}

.chat-flyout-chat {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 0.75rem;
}

.chat-reasoning {
  margin-bottom: 0.75rem;
  border-radius: 8px;
  background: var(--p-content-hover-background, var(--p-surface-100));
  overflow: hidden;
}

.chat-reasoning-toggle {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: none;
  background: none;
  cursor: pointer;
  color: var(--p-text-muted-color);
  font-size: 0.8125rem;
  font-family: inherit;
}

.chat-reasoning-toggle:hover {
  color: var(--p-text-color);
}

.chat-reasoning-toggle i {
  font-size: 0.6875rem;
  transition: transform 0.15s;
}

.chat-reasoning-label {
  font-weight: 500;
}

.chat-reasoning-content {
  padding: 0 0.75rem 0.625rem;
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
  line-height: 1.5;
  white-space: pre-wrap;
  max-height: 12rem;
  overflow-y: auto;
}

.chat-tool-result {
  margin-bottom: 0.5rem;
  border-radius: 8px;
  background: var(--p-content-hover-background, var(--p-surface-100));
  overflow: hidden;
}

.chat-tool-result-toggle {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: none;
  background: none;
  cursor: pointer;
  color: var(--p-text-muted-color);
  font-size: 0.8125rem;
  font-family: inherit;
}

.chat-tool-result-toggle:hover {
  color: var(--p-text-color);
}

.chat-tool-result-toggle i:first-child {
  font-size: 0.75rem;
  color: var(--p-primary-color);
}

.chat-tool-result-chevron {
  margin-left: auto;
  font-size: 0.6875rem;
}

.chat-tool-result-data {
  margin: 0;
  padding: 0 0.75rem 0.625rem;
  font-size: 0.6875rem;
  color: var(--p-text-muted-color);
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 12rem;
  overflow-y: auto;
}

.chat-tool-activity {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  margin-bottom: 0.5rem;
  border-radius: 8px;
  background: var(--p-content-hover-background, var(--p-surface-100));
  color: var(--p-text-muted-color);
  font-size: 0.8125rem;
  font-weight: 500;
}

.chat-tool-activity i {
  font-size: 0.875rem;
  color: var(--p-primary-color);
}

.chat-thinking {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0;
  color: var(--p-text-muted-color);
  font-size: 0.8125rem;
}

.chat-thinking-dots {
  display: inline-flex;
  gap: 3px;
}

.chat-thinking-dots span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--p-text-muted-color);
  animation: thinking-bounce 1.2s infinite ease-in-out;
}

.chat-thinking-dots span:nth-child(2) {
  animation-delay: 0.2s;
}

.chat-thinking-dots span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes thinking-bounce {
  0%, 60%, 100% {
    opacity: 0.3;
    transform: scale(0.8);
  }
  30% {
    opacity: 1;
    transform: scale(1);
  }
}

/* Interaction prompts */
.chat-interaction {
  padding: 0.75rem;
  border-top: 1px solid var(--p-surface-border, var(--p-surface-200));
  background: var(--p-surface-ground, var(--p-surface-50));
}

.chat-interaction-question {
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: 0.625rem;
  color: var(--p-text-color);
}

.chat-interaction-options {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}

.chat-interaction-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.4375rem 0.75rem;
  border-radius: 1rem;
  border: 1px solid var(--p-surface-border, var(--p-surface-300));
  background: var(--p-surface-card, #fff);
  color: var(--p-text-color);
  font-size: 0.8125rem;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.12s;
}

.chat-interaction-btn:hover {
  background: var(--p-primary-color);
  color: var(--p-primary-contrast-color, #fff);
  border-color: var(--p-primary-color);
}

.chat-interaction-btn--other {
  border-style: dashed;
  color: var(--p-text-muted-color);
}

.chat-interaction-btn--other:hover {
  background: var(--p-surface-100);
  color: var(--p-text-color);
  border-color: var(--p-surface-border, var(--p-surface-400));
}

.chat-interaction-other {
  display: flex;
  gap: 0.375rem;
  margin-top: 0.5rem;
}

.chat-interaction-other-input {
  flex: 1;
  padding: 0.4375rem 0.625rem;
  border-radius: 0.5rem;
  border: 1px solid var(--p-surface-border, var(--p-surface-300));
  font-size: 0.8125rem;
  font-family: inherit;
  background: var(--p-surface-card, #fff);
  color: var(--p-text-color);
  outline: none;
}

.chat-interaction-other-input:focus {
  border-color: var(--p-primary-color);
}

.chat-interaction-btn--submit {
  background: var(--p-primary-color);
  color: var(--p-primary-contrast-color, #fff);
  border-color: var(--p-primary-color);
}

.chat-interaction-btn--submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
