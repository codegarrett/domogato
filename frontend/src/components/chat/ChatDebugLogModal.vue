<template>
  <div
    v-if="visible"
    class="chat-debug-overlay"
    role="dialog"
    aria-modal="true"
    :aria-label="$t('ai.debugLogTitle')"
    @click.self="close"
  >
    <div class="chat-debug-panel">
      <div class="chat-debug-header">
        <span class="chat-debug-title">{{ $t('ai.debugLogTitle') }}</span>
        <Button
          icon="pi pi-times"
          text
          rounded
          size="small"
          :aria-label="$t('ai.debugLogClose')"
          @click="close"
        />
      </div>
      <div class="chat-debug-toolbar">
        <span class="chat-debug-count">{{ $t('ai.debugLogCount', { count: logs.length }) }}</span>
        <div class="chat-debug-actions">
          <Button
            :label="$t('ai.debugLogCopy')"
            icon="pi pi-copy"
            size="small"
            text
            @click="copyLogs"
          />
          <Button
            :label="$t('ai.debugLogClear')"
            icon="pi pi-trash"
            size="small"
            text
            severity="danger"
            @click="$emit('clear')"
          />
        </div>
      </div>
      <pre class="chat-debug-log">{{ formattedLogs }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Button from 'primevue/button'
import type { ChatDebugLogEntry } from '@/stores/chat'

const props = defineProps<{
  logs: ChatDebugLogEntry[]
}>()

const visible = defineModel<boolean>('visible', { required: true })

defineEmits<{
  clear: []
}>()

const formattedLogs = computed(() => JSON.stringify(props.logs, null, 2))

function close() {
  visible.value = false
}

async function copyLogs() {
  try {
    await navigator.clipboard.writeText(formattedLogs.value)
  } catch {
    // clipboard unavailable
  }
}
</script>

<style scoped>
.chat-debug-overlay {
  position: absolute;
  inset: 0;
  z-index: 20;
  display: flex;
  align-items: stretch;
  justify-content: center;
  padding: 0.75rem;
  background: rgb(0 0 0 / 35%);
}

.chat-debug-panel {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-height: 100%;
  border-radius: 0.5rem;
  border: 1px solid var(--p-surface-border, var(--p-surface-200));
  background: var(--p-surface-card, #fff);
  box-shadow: 0 8px 32px rgb(0 0 0 / 18%);
  overflow: hidden;
}

.chat-debug-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.625rem 0.75rem;
  border-bottom: 1px solid var(--p-surface-border, var(--p-surface-100));
}

.chat-debug-title {
  font-size: 0.9375rem;
  font-weight: 600;
}

.chat-debug-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.625rem 0.75rem 0;
}

.chat-debug-count {
  font-size: 0.8125rem;
  color: var(--p-text-muted-color);
}

.chat-debug-actions {
  display: flex;
  gap: 0.25rem;
}

.chat-debug-log {
  flex: 1;
  min-height: 0;
  margin: 0.625rem 0.75rem 0.75rem;
  overflow: auto;
  padding: 0.75rem;
  border-radius: 0.5rem;
  background: var(--p-surface-900, #111827);
  color: var(--p-green-300, #86efac);
  font-size: 0.75rem;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
