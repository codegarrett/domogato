<template>
  <Dialog
    v-model:visible="visible"
    modal
    :header="$t('ai.debugLogTitle')"
    class="chat-debug-dialog"
    :style="{ width: 'min(48rem, 95vw)' }"
  >
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
  </Dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Dialog from 'primevue/dialog'
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

async function copyLogs() {
  try {
    await navigator.clipboard.writeText(formattedLogs.value)
  } catch {
    // clipboard unavailable
  }
}
</script>

<style scoped>
.chat-debug-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
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
  margin: 0;
  max-height: 60vh;
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
