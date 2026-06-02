<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import Select from 'primevue/select'
import Dialog from 'primevue/dialog'
import TicketTablePlanningSection from '@/components/tickets/TicketTable/TicketTablePlanningSection.vue'
import { useTicketTableInlineEdit } from '@/composables/useTicketTableInlineEdit'
import { displayTicketKey } from '@/utils/displayTicketKey'
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
import { deleteTicket, updateTicket, type Ticket } from '@/api/tickets'
import TicketBulkDeleteDialog from '@/components/tickets/TicketBulkDeleteDialog.vue'
import { useProjectAdmin } from '@/composables/useProjectAdmin'
import {
  DEFAULT_TICKET_SORT_COLUMN,
  DEFAULT_TICKET_SORT_DIRECTION,
  sortTicketsInPlace,
  toggleTicketSort,
  type TicketSortColumn,
  type SortDirection,
} from '@/utils/ticketTableSort'
import {
  appendGroupToTargetList,
  applyIntraListGroupMove,
  dragGroupIds,
} from '@/utils/planningMultiDrag'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const toast = useToastService()
const projectId = route.params.projectId as string

const organizationId = computed(() => project.value?.organization_id)
const { canAdministerProject } = useProjectAdmin(() => projectId, () => organizationId.value)

const deleteDialogVisible = ref(false)
const deletingTickets = ref(false)

const {
  project,
  assigneeOptions,
  resolveAssigneeName,
  resolveStatusName,
  resolveStatusStyle,
  statusTransitionOptions,
  loadMeta,
} = useProjectTicketMeta(() => projectId)

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

const selectedTicketIds = computed(() => new Set(selectedTickets.value.map((t) => t.id)))

const sortColumn = ref<TicketSortColumn>(DEFAULT_TICKET_SORT_COLUMN)
const sortDirection = ref<SortDirection>(DEFAULT_TICKET_SORT_DIRECTION)

const sortContext = computed(() => ({
  resolveAssigneeName,
  resolveStatusName,
}))

function applyPlanningSort() {
  sortTicketsInPlace(backlogTickets.value, sortColumn.value, sortDirection.value, sortContext.value)
  for (const sid of Object.keys(sprintTickets.value)) {
    const list = sprintTickets.value[sid]
    if (list) sortTicketsInPlace(list, sortColumn.value, sortDirection.value, sortContext.value)
  }
}

function onSortColumn(column: TicketSortColumn) {
  const next = toggleTicketSort(column, sortColumn.value, sortDirection.value)
  sortColumn.value = next.column
  sortDirection.value = next.direction
  applyPlanningSort()
}

function findTicketList(ticketId: string): Ticket[] | null {
  if (backlogTickets.value.some((tk) => tk.id === ticketId)) return backlogTickets.value
  for (const sid of Object.keys(sprintTickets.value)) {
    const list = sprintTickets.value[sid]
    if (list?.some((tk) => tk.id === ticketId)) return list
  }
  return null
}

const {
  editingCell,
  storyPointsEditModel,
  startEdit,
  cancelEdit,
  onEditValueUpdate,
  commitEdit,
  commitStatusEdit,
} = useTicketTableInlineEdit({
  onTicketUpdated: (updated) => {
    const list = findTicketList(updated.id)
    if (!list) return
    const idx = list.findIndex((tk) => tk.id === updated.id)
    if (idx >= 0) list[idx] = updated
  },
})

function ticketKeyLabel(tk: Ticket): string {
  return displayTicketKey(tk, project.value?.key)
}

function getSprintTicketList(sprintId: string): Ticket[] {
  return sprintTickets.value[sprintId] ?? []
}

function setSprintTicketList(sprintId: string, tickets: Ticket[]) {
  sprintTickets.value[sprintId] = tickets
}

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
    for (const s of activeSprints.value) {
      ticketMap[s.id] = []
    }
    await Promise.all(
      activeSprints.value.map(async (s) => {
        const res = await getSprintTickets(s.id, { limit: 200 })
        ticketMap[s.id] = filterPlanningTickets(res.items)
      }),
    )
    sprintTickets.value = ticketMap
    applyPlanningSort()
  } finally {
    loading.value = false
  }
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

async function onSprintDragChange(sprintId: string, evt: { added?: { element: Ticket; newIndex: number }; moved?: { element: Ticket; newIndex: number } }) {
  const targetList = sprintTickets.value[sprintId]
  if (!targetList) return
  if (!evt.added && !evt.moved) return

  if (evt.added) {
    const ticket = evt.added.element as Ticket
    const ids = consumeDragGroup(ticket.id)
    appendGroupToTargetList(targetList, ticket.id, ids, (id) => pullTicketIntoTarget(id, targetList))
    try {
      for (const id of ids) {
        await updateTicket(id, { sprint_id: sprintId })
        const t = findTicketList(id)?.find((tk) => tk.id === id)
        if (t) t.sprint_id = sprintId
      }
    } catch (e) {
      console.error(e)
    }
    await syncAllPlanningOrders()
  } else if (evt.moved) {
    const ticket = evt.moved.element as Ticket
    const ids = consumeDragGroup(ticket.id)
    applyIntraListGroupMove(targetList, evt.moved.newIndex, ids)
    await onSprintDragEnd(sprintId)
  }
}

async function onBacklogDragChange(evt: { added?: { element: Ticket; newIndex: number }; moved?: { element: Ticket; newIndex: number } }) {
  if (!evt.added && !evt.moved) return

  if (evt.added) {
    const ticket = evt.added.element as Ticket
    const ids = consumeDragGroup(ticket.id)
    appendGroupToTargetList(backlogTickets.value, ticket.id, ids, (id) =>
      pullTicketIntoTarget(id, backlogTickets.value),
    )
    try {
      for (const id of ids) {
        await updateTicket(id, { sprint_id: null })
        const list = findTicketList(id)
        const t = list?.find((tk) => tk.id === id)
        if (t) t.sprint_id = null
      }
    } catch (e) {
      console.error(e)
    }
    await syncAllPlanningOrders()
  } else if (evt.moved) {
    const ticket = evt.moved.element as Ticket
    const ids = consumeDragGroup(ticket.id)
    applyIntraListGroupMove(backlogTickets.value, evt.moved.newIndex, ids)
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

async function submitBulkDelete() {
  if (selectedTickets.value.length === 0) return
  deletingTickets.value = true
  const ids = selectedTickets.value.map((tk) => tk.id)
  try {
    const results = await Promise.allSettled(ids.map((id) => deleteTicket(id)))
    const failed = results.filter((r) => r.status === 'rejected').length
    const ok = ids.length - failed
    if (failed === 0) {
      toast.showSuccess(t('common.success'), t('tickets.deletedSuccess', { count: ok }))
    } else {
      toast.showError(t('common.error'), t('tickets.deleteFailed'))
    }
    deleteDialogVisible.value = false
    selectedTickets.value = []
    await loadData()
  } catch {
    toast.showError(t('common.error'), t('tickets.deleteFailed'))
  } finally {
    deletingTickets.value = false
  }
}

function toggleSelect(ticket: Ticket) {
  const idx = selectedTickets.value.findIndex(tk => tk.id === ticket.id)
  if (idx >= 0) selectedTickets.value.splice(idx, 1)
  else selectedTickets.value.push(ticket)
}

function toggleSelectAllInTable(tableTickets: Ticket[]) {
  if (tableTickets.length === 0) return
  const allInTable = tableTickets.every((tk) => selectedTicketIds.value.has(tk.id))
  if (allInTable) {
    const tableIds = new Set(tableTickets.map((t) => t.id))
    selectedTickets.value = selectedTickets.value.filter((t) => !tableIds.has(t.id))
  } else {
    const seen = new Set(selectedTickets.value.map((t) => t.id))
    for (const tk of tableTickets) {
      if (!seen.has(tk.id)) {
        selectedTickets.value.push(tk)
        seen.add(tk.id)
      }
    }
  }
}

let pendingDragGroupIds: string[] | null = null
let dragChangeHandled = false

function onPlanningDragStart(ticket: Ticket, list: Ticket[]) {
  pendingDragGroupIds = dragGroupIds(ticket.id, list, selectedTicketIds.value)
}

function consumeDragGroup(fallbackId: string): string[] {
  dragChangeHandled = true
  const ids = pendingDragGroupIds ?? [fallbackId]
  pendingDragGroupIds = null
  return ids
}

function onPlanningDragEnd() {
  if (!dragChangeHandled) pendingDragGroupIds = null
  dragChangeHandled = false
}

function pullTicketIntoTarget(id: string, targetList: Ticket[]): Ticket | undefined {
  const inTarget = targetList.find((t) => t.id === id)
  if (inTarget) return inTarget

  const backlogIdx = backlogTickets.value.findIndex((t) => t.id === id)
  if (backlogIdx >= 0) return backlogTickets.value.splice(backlogIdx, 1)[0]

  for (const sid of Object.keys(sprintTickets.value)) {
    const list = sprintTickets.value[sid]
    if (!list || list === targetList) continue
    const idx = list.findIndex((t) => t.id === id)
    if (idx >= 0) return list.splice(idx, 1)[0]
  }
  return undefined
}

async function syncAllPlanningOrders() {
  await onBacklogDragEnd()
  for (const s of activeSprints.value) {
    await onSprintDragEnd(s.id)
  }
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
        <Button
          v-if="canAdministerProject && selectedTickets.length > 0"
          :label="$t('tickets.deleteSelected', { n: selectedTickets.length })"
          icon="pi pi-trash"
          severity="danger"
          outlined
          size="small"
          @click="deleteDialogVisible = true"
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

        <div v-show="!collapsed[sprint.id]" class="sprint-body">
          <TicketTablePlanningSection
            :model-value="getSprintTicketList(sprint.id)"
            @update:model-value="setSprintTicketList(sprint.id, $event)"
            :project-id="projectId"
            :sort-column="sortColumn"
            :sort-direction="sortDirection"
            :selected-ids="selectedTicketIds"
            :editing-id="editingCell?.id ?? null"
            :editing-field="editingCell?.field ?? null"
            :edit-value="editingCell?.value ?? null"
            :type-options="typeOptions"
            :priority-options="priorityOptions"
            :assignee-options="assigneeOptions"
            :status-options-for="statusOptionsFor"
            :resolve-assignee-name="resolveAssigneeName"
            :resolve-status-name="resolveStatusName"
            :resolve-status-style="resolveStatusStyle"
            :format-label="formatLabel"
            :priority-severity="prioritySeverity"
            :story-points-model="storyPointsEditModel"
            :ticket-key-label="ticketKeyLabel"
            :empty-text="$t('sprints.noSprintTickets')"
            @sort="onSortColumn"
            @toggle-select="toggleSelect"
            @toggle-select-all="toggleSelectAllInTable(getSprintTicketList(sprint.id))"
            @drag-start="(tk) => onPlanningDragStart(tk, getSprintTicketList(sprint.id))"
            @drag-end="onPlanningDragEnd"
            @start-edit="(tk, field, value) => startEdit(tk, field, value)"
            @commit-edit="(tk) => commitEdit(tk)"
            @commit-status="(tk) => commitStatusEdit(tk)"
            @cancel-edit="cancelEdit"
            @update:edit-value="onEditValueUpdate"
            @update:story-points-model="(v) => { if (editingCell) editingCell.value = v }"
            @drag-change="(evt) => onSprintDragChange(sprint.id, evt)"
          />
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

        <TicketTablePlanningSection
          v-model="backlogTickets"
          :project-id="projectId"
          :sort-column="sortColumn"
          :sort-direction="sortDirection"
          :selected-ids="selectedTicketIds"
          :editing-id="editingCell?.id ?? null"
          :editing-field="editingCell?.field ?? null"
          :edit-value="editingCell?.value ?? null"
          :type-options="typeOptions"
          :priority-options="priorityOptions"
          :assignee-options="assigneeOptions"
          :status-options-for="statusOptionsFor"
          :resolve-assignee-name="resolveAssigneeName"
          :resolve-status-name="resolveStatusName"
          :resolve-status-style="resolveStatusStyle"
          :format-label="formatLabel"
          :priority-severity="prioritySeverity"
          :story-points-model="storyPointsEditModel"
          :ticket-key-label="ticketKeyLabel"
          @sort="onSortColumn"
          @toggle-select="toggleSelect"
          @toggle-select-all="toggleSelectAllInTable(backlogTickets)"
          @drag-start="(tk) => onPlanningDragStart(tk, backlogTickets)"
          @drag-end="onPlanningDragEnd"
          @start-edit="(tk, field, value) => startEdit(tk, field, value)"
          @commit-edit="(tk) => commitEdit(tk)"
          @commit-status="(tk) => commitStatusEdit(tk)"
          @cancel-edit="cancelEdit"
          @update:edit-value="onEditValueUpdate"
          @update:story-points-model="(v) => { if (editingCell) editingCell.value = v }"
          @drag-change="onBacklogDragChange"
        />
        <div v-if="!backlogTickets.length && !loading" class="p-4 text-center text-color-secondary text-sm">
          {{ $t('sprints.emptyBacklog') }}
        </div>
      </div>
    </template>

    <TicketBulkDeleteDialog
      v-model:visible="deleteDialogVisible"
      :count="selectedTickets.length"
      :loading="deletingTickets"
      @confirm="submitBulkDelete"
    />

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

</style>
