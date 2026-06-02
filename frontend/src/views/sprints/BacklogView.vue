<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import draggable from 'vuedraggable'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import Select from 'primevue/select'
import Dialog from 'primevue/dialog'
import BacklogTicketRow from '@/components/backlog/BacklogTicketRow.vue'
import BacklogTicketTableHeader from '@/components/backlog/BacklogTicketTableHeader.vue'
import { useProjectTicketMeta } from '@/composables/useProjectTicketMeta'
import { useToastService } from '@/composables/useToast'
import {
  getBacklog,
  listSprints,
  moveToSprint,
  getSprintTickets,
  reorderBacklog,
  reorderSprintTickets,
  type Sprint,
} from '@/api/sprints'
import { updateTicket, transitionStatus, type Ticket, type TicketUpdate } from '@/api/tickets'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const toast = useToastService()
const projectId = route.params.projectId as string

const {
  project,
  assigneeOptions,
  resolveAssigneeName,
  resolveStatusName,
  resolveStatusStyle,
  statusTransitionOptions,
  loadMeta,
} = useProjectTicketMeta(() => projectId)

function displayTicketKey(tk: Ticket): string {
  if (tk.ticket_key) return tk.ticket_key
  const key = project.value?.key
  if (key) return `${key}-${tk.ticket_number}`
  return `#${tk.ticket_number}`
}

const backlogTickets = ref<Ticket[]>([])
const sprints = ref<Sprint[]>([])
const sprintTickets = ref<Record<string, Ticket[]>>({})
const loading = ref(false)
const backlogTotal = ref(0)

const collapsed = ref<Record<string, boolean>>({})

const selectedTickets = ref<Ticket[]>([])
const showMoveDialog = ref(false)
const targetSprintId = ref<string | null>(null)
const moving = ref(false)

const TICKET_TYPES = ['task', 'bug', 'story', 'epic', 'subtask'] as const
const PRIORITIES = ['highest', 'high', 'medium', 'low', 'lowest'] as const
const typeOptions = TICKET_TYPES.map(v => ({ label: formatLabel(v), value: v }))
const priorityOptions = PRIORITIES.map(v => ({ label: formatLabel(v), value: v }))

const activeSprints = computed(() =>
  sprints.value.filter(s => s.status !== 'completed'),
)

const availableSprintOptions = computed(() =>
  activeSprints.value.map(s => ({
    label: `${s.name}${s.status === 'active' ? ' ★' : ''}`,
    value: s.id,
  })),
)

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
    return c.value == null ? null : Number(c.value)
  },
  set(next: number | null) {
    if (editingCell.value?.field === 'story_points') editingCell.value.value = next
  },
})

function formatLabel(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''
}

function prioritySeverity(p: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
  if (p === 'highest' || p === 'high') return 'danger'
  if (p === 'low' || p === 'lowest') return 'secondary'
  return 'info'
}

function sprintStatusSeverity(s: string): 'success' | 'info' | 'warn' | 'secondary' {
  if (s === 'active') return 'success'
  if (s === 'planning') return 'info'
  return 'secondary'
}

function sprintStatusLabel(s: string): string {
  if (s === 'active') return t('sprints.activeSprint')
  if (s === 'planning') return t('sprints.planningSprint')
  return formatLabel(s)
}

function sumPoints(tickets: Ticket[]): number {
  return tickets.reduce((sum, tk) => sum + (tk.story_points || 0), 0)
}

function toggleCollapse(sprintId: string) {
  collapsed.value[sprintId] = !collapsed.value[sprintId]
}

function statusOptionsFor(ticket: Ticket) {
  return statusTransitionOptions(ticket)
}

/** Subtasks are managed on the parent ticket detail view, not in planning. */
function isPlanningTicket(tk: Ticket): boolean {
  return !tk.parent_ticket_id && tk.ticket_type !== 'subtask'
}

function filterPlanningTickets(tickets: Ticket[]): Ticket[] {
  return tickets.filter(isPlanningTicket)
}

async function loadData() {
  loading.value = true
  try {
    const [backlogRes, sprintRes] = await Promise.all([
      getBacklog(projectId, { limit: 200 }),
      listSprints(projectId, { limit: 100 }),
      loadMeta(),
    ])
    backlogTickets.value = filterPlanningTickets(backlogRes.items)
    backlogTotal.value = backlogTickets.value.length
    sprints.value = sprintRes.items

    const ticketMap: Record<string, Ticket[]> = {}
    await Promise.all(
      activeSprints.value.map(async (s) => {
        const res = await getSprintTickets(s.id, { limit: 200 })
        ticketMap[s.id] = filterPlanningTickets(res.items)
      }),
    )
    sprintTickets.value = ticketMap
  } finally {
    loading.value = false
  }
}

function startEdit(row: Ticket, field: string, currentValue: string | number | null) {
  editingCell.value = { id: row.id, field, value: currentValue }
}
function cancelEdit() { editingCell.value = null }
function findTicketList(ticketId: string): { list: Ticket[]; key: string } | null {
  if (backlogTickets.value.find(tk => tk.id === ticketId)) {
    return { list: backlogTickets.value, key: 'backlog' }
  }
  for (const sid of Object.keys(sprintTickets.value)) {
    const tickets = sprintTickets.value[sid]
    if (tickets?.find(tk => tk.id === ticketId)) {
      return { list: tickets, key: sid }
    }
  }
  return null
}

async function commitEdit(row: Ticket) {
  const cell = editingCell.value
  if (!cell) return
  const newVal = cell.value
  const payload: TicketUpdate = {}
  let changed = false

  if (cell.field === 'ticket_type' && newVal !== row.ticket_type) {
    payload.ticket_type = newVal as string; changed = true
  } else if (cell.field === 'priority' && newVal !== row.priority) {
    payload.priority = newVal as string; changed = true
  } else if (cell.field === 'story_points') {
    const n = (newVal as number | null) ?? null
    if (n !== (row.story_points ?? null)) { payload.story_points = n; changed = true }
  } else if (cell.field === 'assignee_id') {
    const next = (newVal as string | null) ?? null
    if (next !== row.assignee_id) {
      payload.assignee_id = next
      changed = true
    }
  }

  if (changed) {
    try {
      const updated = await updateTicket(row.id, payload)
      const found = findTicketList(row.id)
      if (found) {
        const idx = found.list.findIndex(tk => tk.id === row.id)
        if (idx >= 0) found.list[idx] = updated
      }
    } catch (e) { console.error(e) }
  }
  cancelEdit()
}

async function commitStatusEdit(row: Ticket) {
  const cell = editingCell.value
  if (!cell || cell.field !== 'workflow_status_id') return
  const newStatusId = cell.value as string
  if (newStatusId === row.workflow_status_id) {
    cancelEdit()
    return
  }
  try {
    const updated = await transitionStatus(row.id, { workflow_status_id: newStatusId })
    const found = findTicketList(row.id)
    if (found) {
      const idx = found.list.findIndex(tk => tk.id === row.id)
      if (idx >= 0) found.list[idx] = updated
    }
  } catch (e) { console.error(e) }
  cancelEdit()
}

function onEditValueUpdate(v: string | number | null) {
  if (editingCell.value) editingCell.value.value = v
}

async function onSprintDragEnd(sprintId: string) {
  const ids = (sprintTickets.value[sprintId] || []).map(tk => tk.id)
  if (ids.length > 0) {
    try { await reorderSprintTickets(sprintId, ids) } catch (e) { console.error(e) }
  }
}

async function onBacklogDragEnd() {
  const ids = backlogTickets.value.map(tk => tk.id)
  if (ids.length > 0) {
    try { await reorderBacklog(projectId, ids) } catch (e) { console.error(e) }
  }
}

async function onSprintDragChange(sprintId: string, evt: any) {
  if (evt.added) {
    const ticket = evt.added.element as Ticket
    try {
      await updateTicket(ticket.id, { sprint_id: sprintId })
      ticket.sprint_id = sprintId
    } catch (e) { console.error(e) }
    await onSprintDragEnd(sprintId)
  } else if (evt.moved) {
    await onSprintDragEnd(sprintId)
  }
}

async function onBacklogDragChange(evt: any) {
  if (evt.added) {
    const ticket = evt.added.element as Ticket
    try {
      await updateTicket(ticket.id, { sprint_id: null })
      ticket.sprint_id = null
    } catch (e) { console.error(e) }
    await onBacklogDragEnd()
  } else if (evt.moved) {
    await onBacklogDragEnd()
  }
}

function openMoveDialog() {
  if (selectedTickets.value.length === 0) return
  targetSprintId.value = availableSprintOptions.value[0]?.value ?? null
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
    await loadData()
  } finally {
    moving.value = false
  }
}

function toggleSelect(ticket: Ticket) {
  const idx = selectedTickets.value.findIndex(tk => tk.id === ticket.id)
  if (idx >= 0) selectedTickets.value.splice(idx, 1)
  else selectedTickets.value.push(ticket)
}

function isSelected(ticket: Ticket): boolean {
  return selectedTickets.value.some(tk => tk.id === ticket.id)
}

function goToSprints() {
  router.push(`/projects/${projectId}/sprints`)
}

onMounted(loadData)
</script>

<template>
  <div>
    <div class="flex align-items-center justify-content-between mb-3">
      <div class="flex align-items-center gap-3">
        <h2 class="m-0">{{ $t('sprints.planning') }}</h2>
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
        <Button :label="$t('sprints.title')" icon="pi pi-calendar" severity="secondary" size="small" @click="goToSprints" />
        <Button icon="pi pi-refresh" text rounded size="small" :loading="loading" @click="loadData" />
      </div>
    </div>

    <p class="text-xs text-color-secondary mt-0 mb-3">
      <i class="pi pi-arrows-v mr-1" />{{ $t('sprints.dragHint') }}
    </p>

    <div v-if="loading && backlogTickets.length === 0" class="flex justify-content-center p-6">
      <i class="pi pi-spin pi-spinner text-2xl" />
    </div>

    <template v-else>
      <!-- Sprint sections -->
      <div
        v-for="sprint in activeSprints"
        :key="sprint.id"
        class="sprint-section surface-card border-round shadow-1 mb-3"
      >
        <div
          class="sprint-header flex align-items-center gap-3 p-3 cursor-pointer"
          @click="toggleCollapse(sprint.id)"
        >
          <i :class="collapsed[sprint.id] ? 'pi pi-chevron-right' : 'pi pi-chevron-down'" class="text-color-secondary text-sm" />
          <span class="font-semibold">{{ sprint.name }}</span>
          <Tag :value="sprintStatusLabel(sprint.status)" :severity="sprintStatusSeverity(sprint.status)" class="text-xs" />
          <span class="text-xs text-color-secondary">
            {{ t('sprints.sprintTickets', { count: (sprintTickets[sprint.id] || []).length }) }}
          </span>
          <span class="text-xs text-color-secondary">
            {{ t('sprints.sprintPoints', { points: sumPoints(sprintTickets[sprint.id] || []) }) }}
          </span>
        </div>

        <div v-show="!collapsed[sprint.id]" class="sprint-body backlog-ticket-table-wrap">
          <BacklogTicketTableHeader />
          <draggable
            v-model="sprintTickets[sprint.id]"
            group="tickets"
            item-key="id"
            :animation="150"
            ghost-class="drag-ghost"
            drag-class="drag-active"
            class="ticket-list"
            @change="(evt: any) => onSprintDragChange(sprint.id, evt)"
          >
            <template #item="{ element: tk }">
              <BacklogTicketRow
                :ticket="tk"
                :ticket-key-label="displayTicketKey(tk)"
                :selected="isSelected(tk)"
                :editing-id="editingCell?.id ?? null"
                :editing-field="editingCell?.field ?? null"
                :edit-value="editingCell?.value ?? null"
                :type-options="typeOptions"
                :priority-options="priorityOptions"
                :assignee-options="assigneeOptions"
                :status-options="statusOptionsFor(tk)"
                :resolve-assignee-name="resolveAssigneeName"
                :resolve-status-name="resolveStatusName"
                :resolve-status-style="resolveStatusStyle"
                :format-label="formatLabel"
                :priority-severity="prioritySeverity"
                :story-points-model="storyPointsEditModel"
                @toggle-select="toggleSelect(tk)"
                @start-edit="(field, value) => startEdit(tk, field, value)"
                @commit-edit="commitEdit(tk)"
                @commit-status="commitStatusEdit(tk)"
                @cancel-edit="cancelEdit"
                @update:edit-value="onEditValueUpdate"
                @update:story-points-model="(v) => { if (editingCell) editingCell.value = v }"
              />
            </template>
          </draggable>
          <div v-if="!(sprintTickets[sprint.id] || []).length" class="p-3 text-center text-color-secondary text-sm">
            {{ $t('sprints.noSprintTickets') }}
          </div>
        </div>
      </div>

      <!-- Backlog section -->
      <div class="sprint-section surface-card border-round shadow-1">
        <div class="sprint-header flex align-items-center gap-3 p-3">
          <i class="pi pi-inbox text-color-secondary" />
          <span class="font-semibold">{{ $t('sprints.backlog') }}</span>
          <Tag :value="`${backlogTickets.length} ${$t('sprints.items')}`" severity="secondary" class="text-xs" />
          <span class="text-xs text-color-secondary">
            {{ t('sprints.sprintPoints', { points: sumPoints(backlogTickets) }) }}
          </span>
        </div>

        <div class="backlog-ticket-table-wrap">
          <BacklogTicketTableHeader />
          <draggable
            v-model="backlogTickets"
            group="tickets"
            item-key="id"
            :animation="150"
            ghost-class="drag-ghost"
            drag-class="drag-active"
            class="ticket-list"
            @change="onBacklogDragChange"
          >
          <template #item="{ element: tk }">
            <BacklogTicketRow
              :ticket="tk"
              :ticket-key-label="displayTicketKey(tk)"
              :selected="isSelected(tk)"
              :editing-id="editingCell?.id ?? null"
              :editing-field="editingCell?.field ?? null"
              :edit-value="editingCell?.value ?? null"
              :type-options="typeOptions"
              :priority-options="priorityOptions"
              :assignee-options="assigneeOptions"
              :status-options="statusOptionsFor(tk)"
              :resolve-assignee-name="resolveAssigneeName"
              :resolve-status-name="resolveStatusName"
              :resolve-status-style="resolveStatusStyle"
              :format-label="formatLabel"
              :priority-severity="prioritySeverity"
              :story-points-model="storyPointsEditModel"
              @toggle-select="toggleSelect(tk)"
              @start-edit="(field, value) => startEdit(tk, field, value)"
              @commit-edit="commitEdit(tk)"
              @commit-status="commitStatusEdit(tk)"
              @cancel-edit="cancelEdit"
              @update:edit-value="onEditValueUpdate"
              @update:story-points-model="(v) => { if (editingCell) editingCell.value = v }"
            />
          </template>
        </draggable>
        </div>
        <div v-if="!backlogTickets.length && !loading" class="p-4 text-center text-color-secondary text-sm">
          {{ $t('sprints.emptyBacklog') }}
        </div>
      </div>
    </template>

    <!-- Move to Sprint dialog -->
    <Dialog v-model:visible="showMoveDialog" :header="$t('sprints.moveToSprintBtn')" modal :style="{ width: '28rem', maxWidth: '95vw' }">
      <div class="flex flex-column gap-3">
        <p class="text-sm text-color-secondary m-0">
          {{ $t('sprints.moveDescription', { count: selectedTickets.length }) }}
        </p>
        <div>
          <label class="block text-sm font-semibold mb-1">{{ $t('sprints.targetSprint') }}</label>
          <Select
            v-model="targetSprintId"
            :options="availableSprintOptions"
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
.sprint-section {
  overflow: hidden;
}

.sprint-header {
  border-bottom: 1px solid var(--p-content-border-color);
  transition: background 0.15s;
  user-select: none;
}

.sprint-header:hover {
  background: var(--p-content-hover-background, var(--p-surface-50));
}

.ticket-list {
  min-height: 2.5rem;
}

.drag-ghost {
  opacity: 0.4;
  background: var(--p-primary-50, #eef2ff);
}

.drag-active {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border-radius: 6px;
}
</style>
