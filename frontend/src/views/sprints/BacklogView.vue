<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import Select from 'primevue/select'
import InputNumber from 'primevue/inputnumber'
import Dialog from 'primevue/dialog'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import { useToastService } from '@/composables/useToast'
import {
  getBacklog,
  listSprints,
  moveToSprint,
  type Sprint,
} from '@/api/sprints'
import { updateTicket, type Ticket, type TicketUpdate } from '@/api/tickets'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const toast = useToastService()
const projectId = route.params.projectId as string

const backlogTickets = ref<Ticket[]>([])
const sprints = ref<Sprint[]>([])
const loading = ref(false)
const total = ref(0)

const selectedTickets = ref<Ticket[]>([])
const showMoveDialog = ref(false)
const targetSprintId = ref<string | null>(null)
const moving = ref(false)

const TICKET_TYPES = ['task', 'bug', 'story', 'epic', 'subtask'] as const
const PRIORITIES = ['highest', 'high', 'medium', 'low', 'lowest'] as const

const typeOptions = TICKET_TYPES.map(v => ({ label: formatLabel(v), value: v }))
const priorityOptions = PRIORITIES.map(v => ({ label: formatLabel(v), value: v }))

const availableSprints = computed(() =>
  sprints.value
    .filter(s => s.status !== 'completed')
    .map(s => ({ label: `${s.name}${s.status === 'active' ? ' ★' : ''}`, value: s.id })),
)

const sprintRowOptions = computed(() => [
  ...availableSprints.value,
])

interface InlineEdit {
  id: string
  field: string
  value: string | number | null
}
const editingCell = ref<InlineEdit | null>(null)

const storyPointsEditModel = computed({
  get(): number | null {
    const c = editingCell.value
    if (!c || c.field !== 'story_points') return null
    const v = c.value
    if (v == null) return null
    return typeof v === 'number' ? v : Number(v)
  },
  set(next: number | null) {
    const c = editingCell.value
    if (c?.field === 'story_points') c.value = next
  },
})

function formatLabel(s: string): string {
  if (!s) return ''
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function prioritySeverity(p: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
  if (p === 'highest' || p === 'high') return 'danger'
  if (p === 'low' || p === 'lowest') return 'secondary'
  return 'info'
}

function sprintName(sprintId: string | null): string {
  if (!sprintId) return '—'
  const s = sprints.value.find(sp => sp.id === sprintId)
  return s ? s.name : '—'
}

async function loadBacklog() {
  loading.value = true
  try {
    const [backlogRes, sprintRes] = await Promise.all([
      getBacklog(projectId, { limit: 200 }),
      listSprints(projectId, { limit: 100 }),
    ])
    backlogTickets.value = backlogRes.items
    total.value = backlogRes.total
    sprints.value = sprintRes.items
  } finally {
    loading.value = false
  }
}

function startEdit(row: Ticket, field: string, currentValue: string | number | null) {
  editingCell.value = { id: row.id, field, value: currentValue }
}

function cancelEdit() {
  editingCell.value = null
}

function isEditing(rowId: string, field: string): boolean {
  return editingCell.value?.id === rowId && editingCell.value?.field === field
}

function applyPatch(ticketId: string, updated: Ticket) {
  backlogTickets.value = backlogTickets.value.map(tk => tk.id === ticketId ? updated : tk)
}

async function commitEdit(row: Ticket) {
  const cell = editingCell.value
  if (!cell) return

  const newVal = cell.value
  const payload: TicketUpdate = {}
  let changed = false

  if (cell.field === 'ticket_type' && newVal !== row.ticket_type) {
    payload.ticket_type = newVal as string
    changed = true
  } else if (cell.field === 'priority' && newVal !== row.priority) {
    payload.priority = newVal as string
    changed = true
  } else if (cell.field === 'story_points') {
    const n = (newVal as number | null) ?? null
    if (n !== (row.story_points ?? null)) {
      payload.story_points = n
      changed = true
    }
  } else if (cell.field === 'sprint_id') {
    const next = (newVal as string | null) ?? null
    if (next !== (row.sprint_id ?? null)) {
      payload.sprint_id = next
      changed = true
    }
  }

  if (changed) {
    try {
      const updated = await updateTicket(row.id, payload)
      if (cell.field === 'sprint_id' && payload.sprint_id) {
        backlogTickets.value = backlogTickets.value.filter(tk => tk.id !== row.id)
        total.value = Math.max(0, total.value - 1)
      } else {
        applyPatch(row.id, updated)
      }
    } catch (e) {
      console.error(e)
    }
  }

  cancelEdit()
}

async function onStoryPointsBlur(row: Ticket) {
  await commitEdit(row)
}

function openMoveDialog() {
  if (selectedTickets.value.length === 0) return
  targetSprintId.value = availableSprints.value[0]?.value ?? null
  showMoveDialog.value = true
}

async function onMove() {
  if (!targetSprintId.value || selectedTickets.value.length === 0) return
  moving.value = true
  try {
    const ids = selectedTickets.value.map(tk => tk.id)
    const result = await moveToSprint(projectId, ids, targetSprintId.value)
    toast.showSuccess(t('common.success'), t('sprints.movedToSprint', { count: result.moved }))
    showMoveDialog.value = false
    selectedTickets.value = []
    await loadBacklog()
  } finally {
    moving.value = false
  }
}

function goToSprints() {
  router.push(`/projects/${projectId}/sprints`)
}

onMounted(loadBacklog)
</script>

<template>
  <div>
    <div class="flex align-items-center justify-content-between mb-4">
      <div class="flex align-items-center gap-3">
        <h2 class="m-0">{{ $t('sprints.backlog') }}</h2>
        <Tag :value="`${total} ${$t('sprints.items')}`" severity="secondary" />
      </div>
      <div class="flex gap-2">
        <Button
          :label="$t('sprints.moveToSprintBtn')"
          icon="pi pi-arrow-right"
          severity="info"
          size="small"
          :disabled="selectedTickets.length === 0"
          @click="openMoveDialog"
        />
        <Button :label="$t('sprints.title')" icon="pi pi-calendar" severity="secondary" @click="goToSprints" />
      </div>
    </div>

    <DataTable
      :value="backlogTickets"
      :loading="loading"
      v-model:selection="selectedTickets"
      dataKey="id"
      stripedRows
      scrollable
      scrollHeight="60vh"
      paginator
      :rows="50"
      :rows-per-page-options="[25, 50, 100]"
      responsiveLayout="scroll"
      class="backlog-table"
    >
      <template #empty>
        <div class="text-center text-color-secondary p-4">{{ $t('sprints.emptyBacklog') }}</div>
      </template>
      <Column selectionMode="multiple" headerStyle="width: 3rem" />

      <Column :header="$t('tickets.title')" field="ticket_key">
        <template #body="{ data }">
          <div class="flex align-items-center gap-2">
            <router-link
              :to="`/tickets/${data.id}`"
              class="no-underline flex align-items-center gap-2"
              @click.stop
            >
              <Tag :value="data.ticket_key || `#${data.ticket_number}`" severity="info" class="text-xs" />
              <span class="font-medium text-primary hover:underline">{{ data.title }}</span>
            </router-link>
          </div>
        </template>
      </Column>

      <Column :header="$t('tickets.type')" style="width: 8rem">
        <template #body="{ data }">
          <div v-if="isEditing(data.id, 'ticket_type')" @click.stop>
            <Select
              v-model="editingCell!.value"
              :options="typeOptions"
              option-label="label"
              option-value="value"
              class="w-full p-inputtext-sm"
              @update:model-value="commitEdit(data)"
            />
          </div>
          <Tag
            v-else
            :value="formatLabel(data.ticket_type)"
            severity="secondary"
            class="text-xs cursor-pointer inline-editable-tag"
            @click.stop="startEdit(data, 'ticket_type', data.ticket_type)"
          />
        </template>
      </Column>

      <Column :header="$t('tickets.priority')" style="width: 8rem">
        <template #body="{ data }">
          <div v-if="isEditing(data.id, 'priority')" @click.stop>
            <Select
              v-model="editingCell!.value"
              :options="priorityOptions"
              option-label="label"
              option-value="value"
              class="w-full p-inputtext-sm"
              @update:model-value="commitEdit(data)"
            />
          </div>
          <Tag
            v-else
            :value="formatLabel(data.priority)"
            :severity="prioritySeverity(data.priority)"
            class="text-xs cursor-pointer inline-editable-tag"
            @click.stop="startEdit(data, 'priority', data.priority)"
          />
        </template>
      </Column>

      <Column :header="$t('tickets.storyPoints')" style="width: 8rem">
        <template #body="{ data }">
          <div v-if="isEditing(data.id, 'story_points')" @click.stop>
            <InputNumber
              v-model="storyPointsEditModel"
              :min="0"
              :max="999"
              class="w-full p-inputtext-sm"
              input-class="w-full"
              @keydown.enter.prevent="commitEdit(data)"
              @keydown.escape="cancelEdit"
              @blur="onStoryPointsBlur(data)"
            />
          </div>
          <span
            v-else
            class="inline-editable text-sm"
            @click.stop="startEdit(data, 'story_points', data.story_points ?? null)"
          >
            {{ data.story_points != null ? data.story_points : '—' }}
          </span>
        </template>
      </Column>

      <Column :header="$t('nav.sprints')" style="width: 12rem">
        <template #body="{ data }">
          <div v-if="isEditing(data.id, 'sprint_id')" @click.stop>
            <Select
              v-model="editingCell!.value"
              :options="sprintRowOptions"
              option-label="label"
              option-value="value"
              :placeholder="$t('tickets.noSprint')"
              class="w-full p-inputtext-sm"
              show-clear
              @update:model-value="commitEdit(data)"
            />
          </div>
          <span
            v-else
            class="inline-editable text-sm"
            @click.stop="startEdit(data, 'sprint_id', data.sprint_id)"
          >
            {{ sprintName(data.sprint_id) }}
          </span>
        </template>
      </Column>
    </DataTable>

    <Dialog v-model:visible="showMoveDialog" :header="$t('sprints.moveToSprintBtn')" modal :style="{ width: '28rem', maxWidth: '95vw' }">
      <div class="flex flex-column gap-3">
        <p class="text-sm text-color-secondary m-0">
          {{ $t('sprints.moveDescription', { count: selectedTickets.length }) }}
        </p>
        <div>
          <label class="block text-sm font-semibold mb-1">{{ $t('sprints.targetSprint') }}</label>
          <Select
            v-model="targetSprintId"
            :options="availableSprints"
            optionLabel="label"
            optionValue="value"
            :placeholder="$t('sprints.selectSprint')"
            class="w-full"
          />
        </div>
      </div>
      <template #footer>
        <Button :label="$t('common.cancel')" severity="secondary" text @click="showMoveDialog = false" />
        <Button :label="$t('sprints.moveToSprintBtn')" icon="pi pi-arrow-right" :loading="moving" :disabled="!targetSprintId" @click="onMove" />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.backlog-table :deep(.p-datatable tbody tr) {
  cursor: default;
}

.inline-editable {
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  transition: background 0.15s;
}

.inline-editable:hover {
  background: var(--p-surface-100, #f1f5f9);
}

.inline-editable-tag {
  transition: opacity 0.15s, box-shadow 0.15s;
}

.inline-editable-tag:hover {
  opacity: 0.85;
  box-shadow: 0 0 0 2px var(--p-primary-200, #bfdbfe);
}
</style>
