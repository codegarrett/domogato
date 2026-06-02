<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import ProgressBar from 'primevue/progressbar'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import TicketInlineAssigneeCell from '@/components/tickets/TicketInlineAssigneeCell.vue'
import TicketInlineStatusCell from '@/components/tickets/TicketInlineStatusCell.vue'
import { useProjectTicketMeta } from '@/composables/useProjectTicketMeta'
import {
  getTicketChildren,
  createTicket,
  updateTicket,
  transitionStatus,
  type Ticket,
} from '@/api/tickets'
import { ticketDetailPath } from '@/utils/ticketUrls'

const props = defineProps<{
  parentTicket: Ticket
  projectId: string
}>()

const emit = defineEmits<{
  updated: []
}>()

const router = useRouter()

const children = ref<Ticket[]>([])
const loading = ref(false)

const {
  assigneeOptions,
  resolveAssigneeName,
  resolveStatusName,
  resolveStatusStyle,
  statusTransitionOptions,
  statusMap,
  loadMeta,
} = useProjectTicketMeta(() => props.projectId)

interface InlineEdit {
  id: string
  field: string
  value: string | null
}
const editingCell = ref<InlineEdit | null>(null)

const createVisible = ref(false)
const createTitle = ref('')
const createAssigneeId = ref<string | null>(null)
const creating = ref(false)

const doneCount = computed(() =>
  children.value.filter((c) => statusMap.value.get(c.workflow_status_id)?.is_terminal).length,
)

const progressPercent = computed(() => {
  if (children.value.length === 0) return 0
  return Math.round((doneCount.value / children.value.length) * 100)
})

const inlineEditValue = computed({
  get(): string | null {
    return editingCell.value?.value ?? null
  },
  set(v: string | null) {
    if (editingCell.value) editingCell.value.value = v
  },
})

async function loadChildren() {
  loading.value = true
  try {
    children.value = await getTicketChildren(props.parentTicket.id)
  } catch {
    children.value = []
  } finally {
    loading.value = false
  }
}

function startEdit(row: Ticket, field: string, value: string | null) {
  editingCell.value = { id: row.id, field, value }
}

function cancelEdit() {
  editingCell.value = null
}

function patchChild(id: string, updated: Ticket) {
  children.value = children.value.map((c) => (c.id === id ? updated : c))
  emit('updated')
}

async function commitAssignee(row: Ticket) {
  const cell = editingCell.value
  if (!cell || cell.field !== 'assignee_id') return
  const next = cell.value
  if (next === row.assignee_id) {
    cancelEdit()
    return
  }
  try {
    const updated = await updateTicket(row.id, { assignee_id: next })
    patchChild(row.id, updated)
  } catch (e) {
    console.error(e)
  }
  cancelEdit()
}

async function commitStatus(row: Ticket) {
  const cell = editingCell.value
  if (!cell || cell.field !== 'workflow_status_id') return
  const newStatusId = cell.value
  if (!newStatusId || newStatusId === row.workflow_status_id) {
    cancelEdit()
    return
  }
  try {
    const updated = await transitionStatus(row.id, { workflow_status_id: newStatusId })
    patchChild(row.id, updated)
  } catch (e) {
    console.error(e)
  }
  cancelEdit()
}

function openCreate() {
  createTitle.value = ''
  createAssigneeId.value = null
  createVisible.value = true
}

async function submitCreate() {
  const title = createTitle.value.trim()
  if (!title) return
  creating.value = true
  try {
    await createTicket(props.projectId, {
      title,
      ticket_type: 'subtask',
      parent_ticket_id: props.parentTicket.id,
      priority: props.parentTicket.priority,
      assignee_id: createAssigneeId.value,
    })
    createVisible.value = false
    await loadChildren()
    emit('updated')
  } finally {
    creating.value = false
  }
}

function goToTicket(child: Ticket) {
  router.push(ticketDetailPath(props.projectId, child))
}

watch(() => props.parentTicket.id, loadChildren)

onMounted(async () => {
  await loadMeta()
  await loadChildren()
})
</script>

<template>
  <div class="surface-card p-4 border-round shadow-1 mb-4">
    <div class="flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
      <div class="flex align-items-center gap-2">
        <i class="pi pi-sitemap text-color-secondary" />
        <span class="text-sm font-semibold">{{ $t('tickets.subtasks') }}</span>
        <Tag
          v-if="children.length"
          :value="$t('tickets.subtasksProgress', { done: doneCount, total: children.length })"
          severity="secondary"
          class="text-xs"
        />
      </div>
      <Button
        :label="$t('tickets.createSubtask')"
        icon="pi pi-plus"
        size="small"
        @click="openCreate"
      />
    </div>

    <ProgressBar
      v-if="children.length > 0"
      :value="progressPercent"
      class="mb-3"
      style="height: 0.5rem"
    />

    <div v-if="loading" class="flex justify-content-center p-3">
      <i class="pi pi-spin pi-spinner text-color-secondary" />
    </div>
    <div v-else-if="children.length === 0" class="text-color-secondary text-sm">
      {{ $t('tickets.subtasksEmpty') }}
    </div>
    <div v-else class="subtasks-table">
      <div class="subtasks-header">
        <span>{{ $t('projects.key') }}</span>
        <span>{{ $t('tickets.title') }}</span>
        <span>{{ $t('tickets.assignee') }}</span>
        <span>{{ $t('common.status') }}</span>
        <span class="text-center">{{ $t('sprints.pointsCol') }}</span>
      </div>
      <div
        v-for="child in children"
        :key="child.id"
        class="subtasks-row"
        @click="goToTicket(child)"
      >
        <span class="subtask-key" @click.stop>
          <Tag :value="child.ticket_key || `#${child.ticket_number}`" severity="info" class="text-xs" />
        </span>
        <span class="subtask-title">{{ child.title }}</span>
        <span class="subtask-cell" @click.stop>
          <TicketInlineAssigneeCell
            :ticket="child"
            :editing="editingCell?.id === child.id && editingCell?.field === 'assignee_id'"
            v-model:edit-value="inlineEditValue"
            :assignee-options="assigneeOptions"
            :resolve-assignee-name="resolveAssigneeName"
            compact
            @start="startEdit(child, 'assignee_id', child.assignee_id)"
            @commit="commitAssignee(child)"
          />
        </span>
        <span class="subtask-cell" @click.stop>
          <TicketInlineStatusCell
            :ticket="child"
            :editing="editingCell?.id === child.id && editingCell?.field === 'workflow_status_id'"
            v-model:edit-value="inlineEditValue"
            :status-options="statusTransitionOptions(child)"
            :resolve-status-name="resolveStatusName"
            :resolve-status-style="resolveStatusStyle"
            compact
            @start="startEdit(child, 'workflow_status_id', child.workflow_status_id)"
            @commit="commitStatus(child)"
          />
        </span>
        <span class="subtask-points text-center font-bold">
          {{ child.story_points != null ? child.story_points : '—' }}
        </span>
      </div>
    </div>

    <Dialog
      v-model:visible="createVisible"
      :header="$t('tickets.createSubtask')"
      modal
      :style="{ width: '28rem', maxWidth: '95vw' }"
    >
      <div class="flex flex-column gap-3 pt-1">
        <div>
          <label class="block text-sm mb-2">{{ $t('tickets.addSubtaskTitle') }}</label>
          <InputText v-model="createTitle" class="w-full" autofocus @keydown.enter.prevent="submitCreate" />
        </div>
        <div>
          <label class="block text-sm mb-2">{{ $t('tickets.assignee') }}</label>
          <Select
            v-model="createAssigneeId"
            :options="assigneeOptions"
            option-label="label"
            option-value="value"
            :placeholder="$t('tickets.unassigned')"
            class="w-full"
            show-clear
          />
        </div>
      </div>
      <template #footer>
        <Button :label="$t('common.cancel')" severity="secondary" text @click="createVisible = false" />
        <Button
          :label="$t('tickets.createSubtask')"
          icon="pi pi-check"
          :loading="creating"
          :disabled="!createTitle.trim()"
          @click="submitCreate"
        />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.subtasks-table {
  display: flex;
  flex-direction: column;
  gap: 0;
  border: 1px solid var(--p-content-border-color);
  border-radius: 6px;
  overflow: hidden;
}

.subtasks-header,
.subtasks-row {
  display: grid;
  grid-template-columns: 5.5rem 1fr 8.5rem 7.5rem 3rem;
  align-items: center;
  column-gap: 0.5rem;
  padding: 0.5rem 0.75rem;
}

.subtasks-header {
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--p-text-muted-color, #64748b);
  background: var(--p-surface-50, #f8fafc);
  border-bottom: 1px solid var(--p-content-border-color);
}

.subtasks-row {
  border-bottom: 1px solid var(--p-content-border-color);
  cursor: pointer;
  transition: background 0.12s;
}

.subtasks-row:last-child {
  border-bottom: none;
}

.subtasks-row:hover {
  background: var(--p-content-hover-background, var(--p-surface-50));
}

.subtask-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
}

.subtask-cell {
  min-width: 0;
}

.subtask-points {
  font-size: 1.0625rem;
}
</style>
