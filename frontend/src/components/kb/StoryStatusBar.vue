<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  getStoryWorkflow,
  updatePageMeta,
  type StoryWorkflowStatus,
  type PageMetaBrief,
} from '@/api/kb'
import Select from 'primevue/select'
import Tag from 'primevue/tag'

const props = defineProps<{
  pageId: string
  projectId: string
  meta: PageMetaBrief
}>()

const emit = defineEmits<{
  (e: 'updated', meta: PageMetaBrief): void
}>()

const { t } = useI18n()

const statuses = ref<StoryWorkflowStatus[]>([])
const selectedStatusId = ref<string | null>(null)
const loading = ref(false)
const editing = ref(false)

const currentStatus = computed(() => {
  if (!props.meta?.story_status) return null
  return props.meta.story_status
})

onMounted(async () => {
  try {
    const workflow = await getStoryWorkflow(props.projectId)
    statuses.value = workflow.statuses
    selectedStatusId.value = props.meta.story_workflow_status_id
  } catch {
    // workflow may not exist yet
  }
})

function startEdit() {
  selectedStatusId.value = props.meta.story_workflow_status_id
  editing.value = true
}

async function commitChange() {
  if (!selectedStatusId.value || selectedStatusId.value === props.meta.story_workflow_status_id) {
    editing.value = false
    return
  }
  loading.value = true
  try {
    const updated = await updatePageMeta(props.pageId, {
      story_workflow_status_id: selectedStatusId.value,
    })
    const brief: PageMetaBrief = {
      id: updated.id,
      page_type: updated.page_type,
      story_workflow_status_id: updated.story_workflow_status_id,
      story_status: updated.story_status
        ? {
            id: updated.story_status.id,
            name: updated.story_status.name,
            category: updated.story_status.category,
            color: updated.story_status.color,
          }
        : null,
      ticket_link_count: updated.ticket_link_count,
    }
    emit('updated', brief)
    editing.value = false
  } finally {
    loading.value = false
  }
}

function severityForCategory(cat: string | undefined): string {
  switch (cat) {
    case 'draft': return 'secondary'
    case 'review': return 'warn'
    case 'ready': return 'info'
    case 'ticketed': return 'success'
    default: return 'secondary'
  }
}
</script>

<template>
  <div class="story-status-bar flex align-items-center gap-2 mb-3 py-2 px-3 border-round surface-50">
    <i class="pi pi-clipboard text-primary" />
    <span class="text-sm font-semibold">{{ t('kb.storyStatus') }}</span>
    <template v-if="!editing">
      <Tag
        v-if="currentStatus"
        :value="currentStatus.name"
        :severity="severityForCategory(currentStatus.category)"
        class="cursor-pointer"
        @click="startEdit"
      />
      <span v-else class="text-color-secondary text-sm cursor-pointer" @click="startEdit">
        {{ t('kb.setStatus') }}
      </span>
    </template>
    <template v-else>
      <Select
        v-model="selectedStatusId"
        :options="statuses"
        option-label="name"
        option-value="id"
        class="w-12rem"
        size="small"
        :loading="loading"
        @change="commitChange"
      />
    </template>
  </div>
</template>
