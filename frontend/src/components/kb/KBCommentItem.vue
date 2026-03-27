<script setup lang="ts">
import { computed } from 'vue'
import { type KBComment } from '@/api/kb'
import Avatar from 'primevue/avatar'

const props = defineProps<{
  comment: KBComment
  depth: number
}>()

const emit = defineEmits<{
  reply: [commentId: string]
  edit: [comment: KBComment]
  delete: [commentId: string]
}>()

const initials = computed(() => {
  const name = props.comment.author.display_name || '?'
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .substring(0, 2)
    .toUpperCase()
})

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<template>
  <div class="comment-item" :style="{ marginLeft: depth * 24 + 'px' }">
    <div class="comment-header flex align-items-center gap-2 mb-1">
      <Avatar
        :label="initials"
        :image="comment.author.avatar_url || undefined"
        shape="circle"
        size="small"
        class="flex-shrink-0"
      />
      <span class="font-semibold text-sm">{{ comment.author.display_name }}</span>
      <span class="text-xs text-color-secondary">{{ formatDate(comment.created_at) }}</span>
    </div>

    <!-- eslint-disable-next-line vue/no-v-html -->
    <div
      class="comment-body text-sm mb-1"
      v-html="
        comment.is_deleted
          ? '<em class=\'text-color-secondary\'>Comment deleted</em>'
          : comment.body
      "
    />

    <div v-if="!comment.is_deleted" class="comment-actions flex gap-2 mb-3">
      <button class="p-link text-xs text-color-secondary" @click="emit('reply', comment.id)">
        Reply
      </button>
      <button class="p-link text-xs text-color-secondary" @click="emit('edit', comment)">
        Edit
      </button>
      <button class="p-link text-xs text-red-500" @click="emit('delete', comment.id)">
        Delete
      </button>
    </div>

    <KBCommentItem
      v-for="reply in comment.replies"
      :key="reply.id"
      :comment="reply"
      :depth="depth + 1"
      @reply="(id) => emit('reply', id)"
      @edit="(c) => emit('edit', c)"
      @delete="(id) => emit('delete', id)"
    />
  </div>
</template>

<style scoped>
.comment-item {
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--p-surface-100, #e2e8f0);
}

.comment-item:last-child {
  border-bottom: none;
}

.comment-actions button {
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 4px;
  transition: background 0.12s;
}

.comment-actions button:hover {
  background: var(--p-surface-100, #f1f5f9);
}
</style>
