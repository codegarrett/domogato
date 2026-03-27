<template>
  <div class="chat-input">
    <textarea
      ref="textareaRef"
      v-model="text"
      :placeholder="$t('ai.typeMessage')"
      :disabled="disabled"
      rows="1"
      class="chat-input-textarea"
      @keydown="handleKeydown"
      @input="autoResize"
    />
    <Button
      icon="pi pi-send"
      :disabled="disabled || !text.trim()"
      size="small"
      rounded
      class="chat-input-send"
      :aria-label="$t('ai.send')"
      @click="send"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted } from 'vue'
import Button from 'primevue/button'

const props = defineProps<{
  disabled?: boolean
}>()

const emit = defineEmits<{
  send: [message: string]
}>()

const text = ref('')
const textareaRef = ref<HTMLTextAreaElement>()

function send() {
  if (!text.value.trim() || props.disabled) return
  emit('send', text.value)
  text.value = ''
  nextTick(autoResize)
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault()
    send()
  }
}

function autoResize() {
  const el = textareaRef.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 120) + 'px'
}

onMounted(autoResize)
</script>

<style scoped>
.chat-input {
  display: flex;
  align-items: flex-end;
  gap: 0.5rem;
  padding: 0.75rem;
  border-top: 1px solid var(--p-content-border-color);
  background: var(--p-content-background);
}

.chat-input-textarea {
  flex: 1;
  resize: none;
  border: 1px solid var(--p-content-border-color);
  border-radius: 8px;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  font-family: inherit;
  line-height: 1.4;
  background: var(--p-content-background);
  color: var(--p-text-color);
  outline: none;
  transition: border-color 0.15s;
  min-height: 2.25rem;
  max-height: 120px;
}

.chat-input-textarea:focus {
  border-color: var(--p-primary-color);
}

.chat-input-textarea::placeholder {
  color: var(--p-text-muted-color);
}

.chat-input-send {
  flex-shrink: 0;
}
</style>
