<template>

  <div class="chat-message" :class="[`chat-message--${role}`]">

    <div class="chat-message-bubble">

      <ImageAttachmentGallery

        v-if="imageAttachments.length > 0"

        :attachments="imageAttachments"

        :resolve-download-path="resolveDownloadPath"

        class="chat-message-images"

      />

      <div v-if="nonImageAttachments.length > 0" class="chat-message-files">

        <div

          v-for="attachment in nonImageAttachments"

          :key="attachment.id"

          class="chat-message-file"

        >

          <i class="pi pi-file" />

          <span>{{ attachment.filename }}</span>

          <span class="chat-message-file-size">{{ formatFileSize(attachment.size_bytes) }}</span>

        </div>

      </div>

      <div
        v-if="role === 'assistant'"
        class="chat-message-content prose prose--chat"
        v-html="renderedContent"
      />

      <div v-else-if="content" class="chat-message-content chat-message-content--plain">{{ content }}</div>

    </div>

    <div class="chat-message-meta">

      <span class="chat-message-time">{{ formattedTime }}</span>

    </div>

  </div>

</template>



<script setup lang="ts">

import { computed } from 'vue'

import { renderChatMarkdown } from '@/utils/richContent'

import ImageAttachmentGallery, {

  type ImageAttachmentItem,

} from '@/components/common/ImageAttachmentGallery.vue'

import { formatFileSize } from '@/api/attachments'

import { aiAttachmentDownloadPath, type AIAttachment } from '@/api/ai'



const props = defineProps<{

  role: 'user' | 'assistant' | 'system'

  content: string

  createdAt?: string

  conversationId?: string | null

  attachments?: AIAttachment[]

}>()



const renderedContent = computed(() => renderChatMarkdown(props.content))



const formattedTime = computed(() => {

  if (!props.createdAt) return ''

  const date = new Date(props.createdAt)

  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

})



const imageAttachments = computed<ImageAttachmentItem[]>(() =>

  (props.attachments ?? [])

    .filter((a) => a.content_type.startsWith('image/'))

    .map((a) => ({

      id: a.id,

      filename: a.filename,

      content_type: a.content_type,

    })),

)



const nonImageAttachments = computed(() =>

  (props.attachments ?? []).filter((a) => !a.content_type.startsWith('image/')),

)



function resolveDownloadPath(item: ImageAttachmentItem): string {

  const conversationId = props.conversationId ?? props.attachments?.[0]?.conversation_id

  if (!conversationId) {

    return `/attachments/${item.id}/download`

  }

  return aiAttachmentDownloadPath(conversationId, item.id)

}

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

  padding: 0.5rem 0.75rem;

  border-radius: 12px;

  overflow-wrap: break-word;

}



.chat-message--user .chat-message-bubble {

  background: var(--p-primary-color);

  color: var(--p-primary-contrast-color);

  border-bottom-right-radius: 4px;

}



.chat-message--assistant .chat-message-bubble {

  max-width: 100%;

  background: var(--p-content-hover-background, var(--p-surface-100));

  color: var(--p-text-color);

  border-bottom-left-radius: 4px;

}



.chat-message-images {

  margin-bottom: 0.5rem;

}



.chat-message-files {

  display: flex;

  flex-direction: column;

  gap: 0.25rem;

  margin-bottom: 0.5rem;

  font-size: 0.8125rem;

}



.chat-message-file {

  display: flex;

  align-items: center;

  gap: 0.375rem;

}



.chat-message-file-size {

  opacity: 0.8;

  font-size: 0.75rem;

}



.chat-message-content--plain {

  white-space: pre-wrap;

  font-size: 0.8125rem;

  line-height: 1.5;

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

