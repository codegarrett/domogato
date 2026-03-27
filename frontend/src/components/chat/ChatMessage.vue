<template>
  <div class="chat-message" :class="[`chat-message--${role}`]">
    <div class="chat-message-bubble">
      <div v-if="role === 'assistant'" class="chat-message-content" v-html="renderedContent" />
      <div v-else class="chat-message-content chat-message-content--plain">{{ content }}</div>
    </div>
    <div class="chat-message-meta">
      <span class="chat-message-time">{{ formattedTime }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { marked } from 'marked'

const props = defineProps<{
  role: 'user' | 'assistant' | 'system'
  content: string
  createdAt?: string
}>()

const renderedContent = computed(() => {
  try {
    return marked.parse(props.content, { async: false }) as string
  } catch {
    return props.content
  }
})

const formattedTime = computed(() => {
  if (!props.createdAt) return ''
  const date = new Date(props.createdAt)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
})
</script>

<style scoped>
.chat-message {
  display: flex;
  flex-direction: column;
  margin-bottom: 1rem;
}

.chat-message--user {
  align-items: flex-end;
}

.chat-message--assistant {
  align-items: flex-start;
}

.chat-message-bubble {
  max-width: 85%;
  padding: 0.625rem 0.875rem;
  border-radius: 12px;
  word-break: break-word;
}

.chat-message--user .chat-message-bubble {
  background: var(--p-primary-color);
  color: var(--p-primary-contrast-color);
  border-bottom-right-radius: 4px;
}

.chat-message--assistant .chat-message-bubble {
  background: var(--p-content-hover-background, var(--p-surface-100));
  color: var(--p-text-color);
  border-bottom-left-radius: 4px;
}

.chat-message-content--plain {
  white-space: pre-wrap;
}

.chat-message-content :deep(p) {
  margin: 0 0 0.5rem 0;
}

.chat-message-content :deep(p:last-child) {
  margin-bottom: 0;
}

.chat-message-content :deep(pre) {
  background: var(--p-surface-ground, var(--p-surface-50));
  padding: 0.5rem;
  border-radius: 6px;
  overflow-x: auto;
  font-size: 0.8125rem;
  margin: 0.5rem 0;
}

.chat-message-content :deep(code) {
  font-size: 0.8125rem;
}

.chat-message-content :deep(ul),
.chat-message-content :deep(ol) {
  margin: 0.25rem 0;
  padding-left: 1.25rem;
}

.chat-message-content :deep(li) {
  margin-bottom: 0.125rem;
}

.chat-message-meta {
  margin-top: 0.25rem;
  padding: 0 0.25rem;
}

.chat-message-time {
  font-size: 0.6875rem;
  color: var(--p-text-muted-color);
}
</style>
