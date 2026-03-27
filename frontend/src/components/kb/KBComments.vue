<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import ProgressSpinner from 'primevue/progressspinner'
import RichTextEditor from '@/components/editor/RichTextEditor.vue'
import KBCommentItem from './KBCommentItem.vue'
import {
  listComments,
  createComment,
  updateComment,
  deleteComment,
  type KBComment,
} from '@/api/kb'

const { t } = useI18n()

const props = defineProps<{
  pageId: string
}>()

const comments = ref<KBComment[]>([])
const loading = ref(false)
const submitting = ref(false)
const newCommentBody = ref('')
const replyingTo = ref<string | null>(null)

async function load() {
  loading.value = true
  try {
    comments.value = await listComments(props.pageId)
  } finally {
    loading.value = false
  }
}

async function addComment() {
  if (!newCommentBody.value.trim()) return
  submitting.value = true
  try {
    const body: { body: string; parent_comment_id?: string } = {
      body: newCommentBody.value,
    }
    if (replyingTo.value) body.parent_comment_id = replyingTo.value
    await createComment(props.pageId, body)
    newCommentBody.value = ''
    replyingTo.value = null
    await load()
  } finally {
    submitting.value = false
  }
}

function onReply(commentId: string) {
  replyingTo.value = commentId
}

function cancelReply() {
  replyingTo.value = null
}

function findCommentById(id: string, tree: KBComment[]): KBComment | undefined {
  for (const c of tree) {
    if (c.id === id) return c
    const found = findCommentById(id, c.replies)
    if (found) return found
  }
  return undefined
}

async function onEdit(comment: KBComment) {
  const newBody = prompt('Edit comment:', comment.body)
  if (newBody !== null && newBody.trim()) {
    await updateComment(comment.id, { body: newBody })
    await load()
  }
}

async function onDelete(commentId: string) {
  if (!confirm('Delete this comment?')) return
  await deleteComment(commentId)
  await load()
}

watch(() => props.pageId, load)
onMounted(load)
</script>

<template>
  <div class="kb-comments">
    <h3 class="m-0 mb-3">{{ $t('kb.comments') }}</h3>

    <div class="new-comment mb-4">
      <div v-if="replyingTo" class="reply-indicator flex align-items-center gap-2 mb-2">
        <i class="pi pi-reply text-xs text-color-secondary" />
        <span class="text-xs text-color-secondary">
          {{ t('kb.replyingTo', { name: findCommentById(replyingTo, comments)?.author.display_name ?? '…' }) }}
        </span>
        <button class="p-link text-xs text-color-secondary" @click="cancelReply">
          <i class="pi pi-times" />
        </button>
      </div>

      <RichTextEditor
        v-model="newCommentBody"
        :placeholder="replyingTo ? t('kb.replyPlaceholder') : t('kb.commentPlaceholder')"
      />

      <div class="flex justify-content-end mt-2">
        <Button
          :label="$t('common.submit')"
          size="small"
          icon="pi pi-send"
          :disabled="!newCommentBody.trim()"
          :loading="submitting"
          @click="addComment()"
        />
      </div>
    </div>

    <div v-if="loading" class="text-center py-4">
      <ProgressSpinner />
    </div>

    <div v-else-if="comments.length === 0" class="text-color-secondary text-center py-4">
      {{ $t('kb.noComments') }}
    </div>

    <div v-else class="comment-list">
      <KBCommentItem
        v-for="comment in comments"
        :key="comment.id"
        :comment="comment"
        :depth="0"
        @reply="onReply"
        @edit="onEdit"
        @delete="onDelete"
      />
    </div>
  </div>
</template>

<style scoped>
.kb-comments {
  max-width: 700px;
}

.new-comment {
  border: 1px solid var(--p-surface-100, #e2e8f0);
  border-radius: 8px;
  padding: 0.75rem;
}

.reply-indicator button {
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px;
  border-radius: 4px;
  line-height: 1;
}

.reply-indicator button:hover {
  background: var(--p-surface-100, #f1f5f9);
}
</style>
