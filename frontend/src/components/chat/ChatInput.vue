<template>

  <div

    class="chat-input"

    @dragover.prevent="onDragOver"

    @dragleave.prevent="isDragging = false"

    @drop.prevent="onDrop"

    :class="{ 'chat-input--dragging': isDragging }"

  >

    <div v-if="chatStore.pendingAttachments.length > 0" class="chat-input-attachments">

      <div

        v-for="attachment in chatStore.pendingAttachments"

        :key="attachment.id"

        class="chat-input-attachment-chip"

      >

        <i :class="attachmentIcon(attachment.content_type)" />

        <span class="chat-input-attachment-name" :title="attachment.filename">

          {{ attachment.filename }}

        </span>

        <span class="chat-input-attachment-size">{{ formatFileSize(attachment.size_bytes) }}</span>

        <button

          type="button"

          class="chat-input-attachment-remove"

          :aria-label="$t('ai.removeAttachment')"

          :disabled="disabled || chatStore.isUploadingAttachment"

          @click="chatStore.removeAttachment(attachment.id)"

        >

          <i class="pi pi-times" />

        </button>

      </div>

    </div>



    <div class="chat-input-row">

      <input

        ref="fileInputRef"

        type="file"

        class="chat-input-file"

        :accept="acceptedTypes"

        multiple

        @change="onFileSelect"

      />

      <Button

        icon="pi pi-paperclip"

        text

        rounded

        size="small"

        class="chat-input-attach"

        :disabled="disabled || chatStore.isUploadingAttachment"

        :aria-label="$t('ai.attachFile')"

        @click="openFilePicker"

      />

      <textarea

        ref="textareaRef"

        v-model="text"

        :placeholder="$t('ai.typeMessage')"

        :disabled="disabled"

        rows="1"

        class="chat-input-textarea"

        @keydown="handleKeydown"

        @paste="onPaste"

        @input="autoResize"

      />

      <Button

        icon="pi pi-send"

        :disabled="disabled || (!text.trim() && chatStore.pendingAttachments.length === 0)"

        size="small"

        rounded

        class="chat-input-send"

        :aria-label="$t('ai.send')"

        @click="send"

      />

    </div>

  </div>

</template>



<script setup lang="ts">

import { ref, nextTick, onMounted } from 'vue'

import Button from 'primevue/button'

import { useChatStore } from '@/stores/chat'

import { formatFileSize } from '@/api/attachments'



const props = defineProps<{

  disabled?: boolean

}>()



const emit = defineEmits<{

  send: [message: string]

}>()



const chatStore = useChatStore()

const text = ref('')

const textareaRef = ref<HTMLTextAreaElement>()

const fileInputRef = ref<HTMLInputElement>()

const isDragging = ref(false)



const acceptedTypes = [

  'image/jpeg',

  'image/png',

  'image/gif',

  'image/webp',

  'image/svg+xml',

  'application/pdf',

  'text/plain',

  'text/csv',

  'text/markdown',

  'application/json',

].join(',')



function send() {

  if ((!text.value.trim() && chatStore.pendingAttachments.length === 0) || props.disabled) return

  emit('send', text.value)

  text.value = ''

  nextTick(autoResize)

}



function handleKeydown(e: KeyboardEvent) {

  if (e.key !== 'Enter' || e.shiftKey || e.isComposing) return

  e.preventDefault()

  send()

}



function autoResize() {

  const el = textareaRef.value

  if (!el) return

  el.style.height = 'auto'

  el.style.height = Math.min(el.scrollHeight, 120) + 'px'

}



function openFilePicker() {

  fileInputRef.value?.click()

}



async function handleFiles(files: FileList | File[]) {

  for (const file of files) {

    await chatStore.addAttachment(file)

  }

}



async function onFileSelect(event: Event) {

  const input = event.target as HTMLInputElement

  if (input.files?.length) {

    await handleFiles(input.files)

    input.value = ''

  }

}



async function onPaste(event: ClipboardEvent) {

  const files = event.clipboardData?.files

  if (files?.length) {

    event.preventDefault()

    await handleFiles(files)

  }

}



function onDragOver() {

  if (props.disabled || chatStore.isUploadingAttachment) return

  isDragging.value = true

}



async function onDrop(event: DragEvent) {

  isDragging.value = false

  if (props.disabled || chatStore.isUploadingAttachment) return

  const files = event.dataTransfer?.files

  if (files?.length) {

    await handleFiles(files)

  }

}



function attachmentIcon(contentType: string): string {

  if (contentType.startsWith('image/')) return 'pi pi-image'

  if (contentType === 'application/pdf') return 'pi pi-file-pdf'

  return 'pi pi-file'

}



onMounted(autoResize)

</script>



<style scoped>

.chat-input {

  border-top: 1px solid var(--p-content-border-color);

  background: var(--p-content-background);

}



.chat-input--dragging {

  outline: 2px dashed var(--p-primary-color);

  outline-offset: -2px;

}



.chat-input-attachments {

  display: flex;

  flex-wrap: wrap;

  gap: 0.375rem;

  padding: 0.5rem 0.75rem 0;

}



.chat-input-attachment-chip {

  display: inline-flex;

  align-items: center;

  gap: 0.375rem;

  max-width: 100%;

  padding: 0.25rem 0.5rem;

  border-radius: 999px;

  background: var(--p-content-hover-background, var(--p-surface-100));

  font-size: 0.75rem;

}



.chat-input-attachment-name {

  overflow: hidden;

  text-overflow: ellipsis;

  white-space: nowrap;

  max-width: 140px;

}



.chat-input-attachment-size {

  color: var(--p-text-muted-color);

  flex-shrink: 0;

}



.chat-input-attachment-remove {

  display: inline-flex;

  align-items: center;

  justify-content: center;

  border: none;

  background: transparent;

  color: var(--p-text-muted-color);

  cursor: pointer;

  padding: 0;

}



.chat-input-row {

  display: flex;

  align-items: flex-end;

  gap: 0.5rem;

  padding: 0.75rem;

}



.chat-input-file {

  display: none;

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



.chat-input-send,

.chat-input-attach {

  flex-shrink: 0;

}

</style>

