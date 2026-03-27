<template>
  <Drawer
    v-model:visible="chatStore.isOpen"
    position="right"
    :header="$t('ai.assistant')"
    class="chat-flyout"
    :style="{ width: '420px' }"
    :modal="false"
    :dismissable="true"
  >
    <template #header>
      <div class="chat-flyout-header">
        <Button
          v-if="chatStore.view === 'chat'"
          icon="pi pi-arrow-left"
          text
          size="small"
          :aria-label="$t('ai.back')"
          @click="chatStore.goToList()"
        />
        <span class="chat-flyout-title">{{ $t('ai.assistant') }}</span>
        <Button
          v-if="chatStore.view === 'list'"
          icon="pi pi-plus"
          text
          size="small"
          :aria-label="$t('ai.newConversation')"
          @click="chatStore.newConversation()"
        />
      </div>
    </template>

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
        <template v-for="msg in chatStore.messages" :key="msg.id">
          <!-- Hide assistant messages that only contain tool_calls (no visible content) -->
          <template v-if="msg.role === 'assistant' && msg.tool_calls && !msg.content">
            <!-- hidden: intermediate tool-call request -->
          </template>
          <!-- Tool result messages: collapsible -->
          <div v-else-if="msg.role === 'tool'" class="chat-tool-result">
            <button class="chat-tool-result-toggle" @click="toggleToolResult(msg.id)">
              <i class="pi pi-wrench" />
              <span>{{ toolResultLabel(msg) }}</span>
              <i :class="expandedToolResults[msg.id] ? 'pi pi-chevron-down' : 'pi pi-chevron-right'" class="chat-tool-result-chevron" />
            </button>
            <pre v-if="expandedToolResults[msg.id]" class="chat-tool-result-data">{{ formatToolResult(msg.content) }}</pre>
          </div>
          <!-- Regular user/assistant messages -->
          <ChatMessage
            v-else
            :role="msg.role as 'user' | 'assistant'"
            :content="msg.content"
            :created-at="msg.created_at"
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

      <!-- Interaction prompts -->
      <div v-if="chatStore.pendingInteraction" class="chat-interaction">
        <!-- Multiple choice -->
        <template v-if="chatStore.pendingInteraction.type === 'choice'">
          <div class="chat-interaction-question">
            {{ chatStore.pendingInteraction.question }}
          </div>
          <div class="chat-interaction-options">
            <button
              v-for="(option, idx) in chatStore.pendingInteraction.options"
              :key="idx"
              class="chat-interaction-btn chat-interaction-btn--option"
              @click="chatStore.sendMessage(option)"
            >
              {{ option }}
            </button>
            <button
              class="chat-interaction-btn chat-interaction-btn--other"
              @click="showOtherInput = true"
            >
              {{ $t('ai.otherOption') }}
            </button>
          </div>
          <div v-if="showOtherInput" class="chat-interaction-other">
            <input
              v-model="otherInputValue"
              type="text"
              class="chat-interaction-other-input"
              :placeholder="$t('ai.typeYourOption')"
              @keydown.enter="submitOther"
            />
            <button
              class="chat-interaction-btn chat-interaction-btn--submit"
              :disabled="!otherInputValue.trim()"
              @click="submitOther"
            >
              {{ $t('ai.submitOption') }}
            </button>
          </div>
        </template>

        <!-- Approval request -->
        <template v-if="chatStore.pendingInteraction.type === 'approval'">
          <div class="chat-interaction-approval">
            <div class="chat-interaction-approval-header">
              <i class="pi pi-shield" />
              <span>{{ $t('ai.approvalRequired') }}</span>
            </div>
            <div class="chat-interaction-approval-action">
              {{ chatStore.pendingInteraction.action }}
            </div>
            <div
              v-if="chatStore.pendingInteraction.details && Object.keys(chatStore.pendingInteraction.details).length"
              class="chat-interaction-approval-details"
            >
              <div
                v-for="(val, key) in chatStore.pendingInteraction.details"
                :key="String(key)"
                class="chat-interaction-detail-row"
              >
                <span class="chat-interaction-detail-key">{{ formatDetailKey(String(key)) }}</span>
                <span class="chat-interaction-detail-value">{{ val }}</span>
              </div>
            </div>
            <div class="chat-interaction-approval-actions">
              <button
                class="chat-interaction-btn chat-interaction-btn--approve"
                @click="chatStore.sendMessage('Yes, go ahead')"
              >
                <i class="pi pi-check" />
                {{ $t('ai.approve') }}
              </button>
              <button
                class="chat-interaction-btn chat-interaction-btn--reject"
                @click="chatStore.sendMessage('No, cancel that')"
              >
                <i class="pi pi-times" />
                {{ $t('ai.reject') }}
              </button>
            </div>
          </div>
        </template>
      </div>

      <ChatInput
        :disabled="chatStore.isStreaming"
        @send="chatStore.sendMessage($event)"
      />
    </div>
  </Drawer>
</template>

<script setup lang="ts">
import { watch, ref, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import Drawer from 'primevue/drawer'
import Button from 'primevue/button'
import { useChatStore } from '@/stores/chat'
import ChatMessage from '@/components/chat/ChatMessage.vue'
import ChatInput from '@/components/chat/ChatInput.vue'

const { t } = useI18n()
const chatStore = useChatStore()
const messagesContainer = ref<HTMLElement>()
const reasoningExpanded = ref(true)

const TOOL_DISPLAY_NAMES: Record<string, string> = {
  list_my_projects: 'ai.toolListProjects',
  search_tickets: 'ai.toolSearchTickets',
  get_ticket_details: 'ai.toolGetTicket',
  get_sprint_status: 'ai.toolSprintStatus',
  search_knowledge_base: 'ai.toolSearchKB',
  semantic_search_kb: 'ai.toolSemanticSearchKB',
  create_ticket: 'ai.toolCreateTicket',
  update_ticket: 'ai.toolUpdateTicket',
  transition_ticket_status: 'ai.toolTransitionStatus',
}

function toolDisplayName(name: string): string {
  const key = TOOL_DISPLAY_NAMES[name]
  return key ? t(key) : name.replace(/_/g, ' ')
}

const showOtherInput = ref(false)
const otherInputValue = ref('')

function submitOther() {
  if (otherInputValue.value.trim()) {
    chatStore.sendMessage(otherInputValue.value.trim())
    otherInputValue.value = ''
    showOtherInput.value = false
  }
}

function formatDetailKey(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
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
    showOtherInput.value = false
    otherInputValue.value = ''
  },
)

watch(
  () => chatStore.pendingInteraction,
  () => {
    showOtherInput.value = false
    otherInputValue.value = ''
    scrollToBottom()
  },
)
</script>

<style scoped>
.chat-flyout :deep(.p-drawer-content) {
  padding: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.chat-flyout-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
}

.chat-flyout-title {
  flex: 1;
  font-weight: 600;
  font-size: 1rem;
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

.chat-interaction-approval {
  border-radius: 0.5rem;
  border: 1px solid var(--p-surface-border, var(--p-surface-200));
  background: var(--p-surface-card, #fff);
  overflow: hidden;
}

.chat-interaction-approval-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 0.75rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--p-warning-color, #e6a817);
  background: var(--p-warning-color, #e6a817)0d;
}

.chat-interaction-approval-header i {
  font-size: 0.875rem;
}

.chat-interaction-approval-action {
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--p-text-color);
}

.chat-interaction-approval-details {
  padding: 0 0.75rem 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.chat-interaction-detail-row {
  display: flex;
  gap: 0.5rem;
  font-size: 0.8125rem;
  line-height: 1.5;
}

.chat-interaction-detail-key {
  color: var(--p-text-muted-color);
  min-width: 5rem;
  flex-shrink: 0;
}

.chat-interaction-detail-value {
  color: var(--p-text-color);
  word-break: break-word;
}

.chat-interaction-approval-actions {
  display: flex;
  gap: 0.5rem;
  padding: 0.625rem 0.75rem;
  border-top: 1px solid var(--p-surface-border, var(--p-surface-100));
}

.chat-interaction-btn--approve {
  background: var(--p-green-500, #22c55e);
  color: #fff;
  border-color: var(--p-green-500, #22c55e);
  flex: 1;
  justify-content: center;
}

.chat-interaction-btn--approve:hover {
  background: var(--p-green-600, #16a34a);
  border-color: var(--p-green-600, #16a34a);
}

.chat-interaction-btn--reject {
  background: transparent;
  color: var(--p-text-muted-color);
  border-color: var(--p-surface-border, var(--p-surface-300));
  flex: 1;
  justify-content: center;
}

.chat-interaction-btn--reject:hover {
  background: var(--p-red-50, #fef2f2);
  color: var(--p-red-600, #dc2626);
  border-color: var(--p-red-300, #fca5a5);
}
</style>
