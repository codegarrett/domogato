<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import Avatar from 'primevue/avatar'
import Select from 'primevue/select'
import Message from 'primevue/message'
import { useToastService } from '@/composables/useToast'
import { useProjectAdmin } from '@/composables/useProjectAdmin'
import { assetUrl } from '@/utils/assetUrl'
import { ticketDetailPathFromRef } from '@/utils/ticketUrls'
import { useWebSocket } from '@/composables/useWebSocket'
import {
  listBoards,
  createDefaultBoard,
  syncBoardColumns,
  getBoardTickets,
  moveTicket,
  type Board,
  type BoardTicket,
} from '@/api/boards'
import { getProject, listProjectMembers, type Project, type ProjectMember } from '@/api/projects'
import { listSprints, type Sprint } from '@/api/sprints'
import {
  defaultWorkflowStatusColor,
  normalizeHexColor,
  workflowColumnHeaderStyle,
} from '@/utils/workflowColors'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const toast = useToastService()
const ws = useWebSocket()

const projectId = computed(() => route.params.projectId as string)
const storageKey = computed(() => `board_filters_${projectId.value}`)

const project = ref<Project | null>(null)
const board = ref<Board | null>(null)
const ticketsByStatus = ref<Record<string, BoardTicket[]>>({})
const loading = ref(false)
const rebuilding = ref(false)
const draggingTicket = ref<BoardTicket | null>(null)
const dragOverColumn = ref<string | null>(null)

const sprints = ref<Sprint[]>([])
const selectedSprintId = ref<string | null>(null)
const members = ref<ProjectMember[]>([])
const selectedAssigneeIds = ref<Set<string>>(new Set())

const organizationId = computed(() => project.value?.organization_id)
const { canAdministerProject } = useProjectAdmin(projectId, organizationId)

type SwimlaneMode = 'none' | 'assignee' | 'priority' | 'type'
const swimlaneMode = ref<SwimlaneMode>('none')

const swimlaneOptions = computed(() => [
  { label: t('boards.noSwimlanes'), value: 'none' as const },
  { label: t('boards.byAssignee'), value: 'assignee' as const },
  { label: t('boards.byPriority'), value: 'priority' as const },
  { label: t('boards.byType'), value: 'type' as const },
])

const sprintOptions = computed(() => [
  { label: t('boards.allTickets'), value: null as string | null },
  ...sprints.value.map(s => ({ label: `${s.name} (${s.status})`, value: s.id })),
])

function saveFilters() {
  try {
    localStorage.setItem(storageKey.value, JSON.stringify({
      sprintId: selectedSprintId.value,
      swimlane: swimlaneMode.value,
    }))
  } catch { /* ignore */ }
}

function loadFilters() {
  try {
    const raw = localStorage.getItem(storageKey.value)
    if (raw) {
      const data = JSON.parse(raw)
      if (data.swimlane) swimlaneMode.value = data.swimlane
      if (data.sprintId) selectedSprintId.value = data.sprintId
    }
  } catch { /* ignore */ }
}

function validateSprintFilter() {
  if (!selectedSprintId.value) return
  const exists = sprints.value.some(s => s.id === selectedSprintId.value)
  if (!exists) {
    selectedSprintId.value = null
    saveFilters()
  }
}

const memberMap = computed(() => {
  const map = new Map<string, ProjectMember>()
  for (const m of members.value) {
    map.set(m.user_id, m)
  }
  return map
})

function memberName(userId: string): string {
  return memberMap.value.get(userId)?.display_name || memberMap.value.get(userId)?.email || userId.slice(0, 8) + '…'
}

function memberInitials(userId: string): string {
  const m = memberMap.value.get(userId)
  const name = m?.display_name || m?.email || '?'
  const parts = name.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

const allBoardTickets = computed((): BoardTicket[] => {
  return Object.values(ticketsByStatus.value).flat()
})

const hasNoColumns = computed(
  () => board.value != null && board.value.columns.length === 0,
)

const showNoTicketsHint = computed(
  () =>
    board.value != null
    && board.value.columns.length > 0
    && allBoardTickets.value.length === 0
    && !loading.value,
)

const assigneesOnBoard = computed(() => {
  const ids = new Set<string>()
  for (const tk of allBoardTickets.value) {
    if (tk.assignee_id) ids.add(tk.assignee_id)
  }
  return Array.from(ids).map(id => ({
    id,
    name: memberName(id),
    initials: memberInitials(id),
    avatar_url: memberMap.value.get(id)?.avatar_url ?? null,
    count: allBoardTickets.value.filter(tk => tk.assignee_id === id).length,
  })).sort((a, b) => a.name.localeCompare(b.name))
})

function toggleAssigneeFilter(userId: string) {
  const next = new Set(selectedAssigneeIds.value)
  if (next.has(userId)) {
    next.delete(userId)
  } else {
    next.add(userId)
  }
  selectedAssigneeIds.value = next
}

function clearAssigneeFilter() {
  selectedAssigneeIds.value = new Set()
}

const filteredTicketsByStatus = computed((): Record<string, BoardTicket[]> => {
  if (selectedAssigneeIds.value.size === 0) return ticketsByStatus.value
  const result: Record<string, BoardTicket[]> = {}
  for (const [statusId, tickets] of Object.entries(ticketsByStatus.value)) {
    result[statusId] = tickets.filter(tk =>
      tk.assignee_id && selectedAssigneeIds.value.has(tk.assignee_id),
    )
  }
  return result
})

const columns = computed(() => {
  if (!board.value?.columns.length) return []
  return board.value.columns.map((col) => ({
    ...col,
    name: col.status_name ?? 'Unknown',
    color: normalizeHexColor(
      col.status_color
      ?? defaultWorkflowStatusColor({ category: col.status_category ?? 'to_do' }),
    ),
    tickets: filteredTicketsByStatus.value[col.workflow_status_id] ?? [],
  }))
})

interface SwimlaneGroup {
  key: string
  label: string
  columns: typeof columns.value
}

const swimlanes = computed((): SwimlaneGroup[] => {
  if (columns.value.length === 0) return []

  if (swimlaneMode.value === 'none') {
    return [{ key: '_all', label: '', columns: columns.value }]
  }

  const allTickets: BoardTicket[] = columns.value.flatMap(c => c.tickets)
  let groupFn: (t: BoardTicket) => string
  let labelFn: (key: string) => string

  switch (swimlaneMode.value) {
    case 'assignee':
      groupFn = (tk) => tk.assignee_id || '_unassigned'
      labelFn = (k) => k === '_unassigned' ? t('tickets.unassigned') : memberName(k)
      break
    case 'priority':
      groupFn = (t) => t.priority
      labelFn = (k) => k.charAt(0).toUpperCase() + k.slice(1)
      break
    case 'type':
      groupFn = (t) => t.ticket_type
      labelFn = (k) => k.charAt(0).toUpperCase() + k.slice(1)
      break
    default:
      return [{ key: '_all', label: '', columns: columns.value }]
  }

  if (allTickets.length === 0) {
    return [{ key: '_all', label: '', columns: columns.value }]
  }

  const groups = new Map<string, Set<string>>()
  for (const tk of allTickets) {
    const key = groupFn(tk)
    if (!groups.has(key)) groups.set(key, new Set())
    groups.get(key)!.add(tk.id)
  }

  return Array.from(groups.entries()).map(([key, ticketIds]) => ({
    key,
    label: labelFn(key),
    columns: columns.value.map(col => ({
      ...col,
      tickets: col.tickets.filter(t => ticketIds.has(t.id)),
    })),
  }))
})

let boardWsChannel: string | null = null

function subscribeBoardChannel() {
  if (boardWsChannel) {
    ws.unsubscribe(boardWsChannel)
    boardWsChannel = null
  }
  if (board.value?.id) {
    boardWsChannel = `board:${board.value.id}`
    ws.subscribe(boardWsChannel)
  }
}

async function loadBoard() {
  loading.value = true
  try {
    const proj = await getProject(projectId.value)
    project.value = proj

    let boards = await listBoards(projectId.value)
    let b = boards.find((x) => x.is_default) ?? boards[0]

    if (!b && proj.default_workflow_id) {
      b = await createDefaultBoard(projectId.value, proj.default_workflow_id)
      toast.showSuccess(t('common.success'), t('boards.created'))
    }

    if (!b) {
      board.value = null
      return
    }

    if (b.columns.length === 0 && proj.default_workflow_id && canAdministerProject.value) {
      try {
        b = await syncBoardColumns(projectId.value, b.id)
        toast.showSuccess(t('common.success'), t('boards.rebuilt'))
      } catch { /* interceptor */ }
    }

    board.value = b
    subscribeBoardChannel()

    const [sprintRes, memberRes] = await Promise.all([
      listSprints(projectId.value, { limit: 50 }),
      listProjectMembers(projectId.value, 0, 200),
    ])
    sprints.value = sprintRes.items ?? []
    members.value = memberRes.items ?? []
    validateSprintFilter()

    await refreshTickets()
  } finally {
    loading.value = false
  }
}

async function rebuildBoard() {
  if (!project.value?.default_workflow_id) return
  rebuilding.value = true
  try {
    const updated = await syncBoardColumns(
      projectId.value,
      board.value?.id,
    )
    board.value = updated
    subscribeBoardChannel()
    await refreshTickets()
    toast.showSuccess(t('common.success'), t('boards.rebuilt'))
  } catch {
    toast.showError(t('common.error'), t('boards.rebuildFailed'))
  } finally {
    rebuilding.value = false
  }
}

async function refreshTickets() {
  if (!board.value) return
  const tickets = await getBoardTickets(
    board.value.id,
    selectedSprintId.value || undefined,
  )
  ticketsByStatus.value = tickets
}

watch(selectedSprintId, () => {
  saveFilters()
  void refreshTickets()
})

watch(swimlaneMode, () => {
  saveFilters()
})

watch(projectId, () => {
  loadFilters()
  selectedAssigneeIds.value = new Set()
  void loadBoard()
})

function onDragStart(ticket: BoardTicket, event: DragEvent) {
  draggingTicket.value = ticket
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', ticket.id)
  }
}

function onDragOver(statusId: string, event: DragEvent) {
  event.preventDefault()
  dragOverColumn.value = statusId
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
}

function onDragLeave() {
  dragOverColumn.value = null
}

async function onDrop(statusId: string, event: DragEvent) {
  event.preventDefault()
  dragOverColumn.value = null
  if (!draggingTicket.value) return

  const ticket = draggingTicket.value
  draggingTicket.value = null

  const currentCol = columns.value.find((c) =>
    c.tickets.some((t) => t.id === ticket.id),
  )
  if (currentCol?.workflow_status_id === statusId) return

  try {
    await moveTicket(ticket.id, statusId)
    await refreshTickets()
  } catch { /* global interceptor */ }
}

function goToTicket(ticket: BoardTicket) {
  router.push(ticketDetailPathFromRef(projectId.value, ticket.ticket_key))
}

function priorityClass(p: string): string {
  if (p === 'highest' || p === 'high') return 'text-red-500'
  if (p === 'low' || p === 'lowest') return 'text-color-secondary'
  return 'text-orange-500'
}

function priorityIcon(p: string): string {
  if (p === 'highest') return 'pi pi-angle-double-up'
  if (p === 'high') return 'pi pi-angle-up'
  if (p === 'low') return 'pi pi-angle-down'
  if (p === 'lowest') return 'pi pi-angle-double-down'
  return 'pi pi-minus'
}

let refreshTimer: ReturnType<typeof setTimeout> | null = null

function scheduleRefresh() {
  if (refreshTimer) return
  refreshTimer = setTimeout(async () => {
    refreshTimer = null
    await refreshTickets()
  }, 300)
}

function onWsEvent(data: Record<string, unknown>) {
  const event = data.event as string | undefined
  if (!event) return
  if (
    event.startsWith('ticket.')
    || event.startsWith('sprint.')
    || event === 'comment.added'
    || event === 'ticket.moved'
  ) {
    scheduleRefresh()
  }
}

onMounted(() => {
  loadFilters()
  loadBoard()
  ws.subscribe(`project:${projectId.value}`)
  ws.on('event', onWsEvent)
})

onUnmounted(() => {
  ws.unsubscribe(`project:${projectId.value}`)
  if (boardWsChannel) ws.unsubscribe(boardWsChannel)
  ws.off('event', onWsEvent)
  if (refreshTimer) clearTimeout(refreshTimer)
})
</script>

<template>
  <div>
    <div class="flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
      <h2 class="m-0">{{ $t('boards.title') }}</h2>
      <div class="flex align-items-center gap-2 flex-wrap">
        <Select
          v-if="sprints.length > 0"
          v-model="selectedSprintId"
          :options="sprintOptions"
          option-label="label"
          option-value="value"
          :placeholder="$t('boards.filterBySprint')"
          class="w-12rem"
        />
        <Select
          v-model="swimlaneMode"
          :options="swimlaneOptions"
          option-label="label"
          option-value="value"
          class="w-10rem"
        />
        <Button icon="pi pi-refresh" severity="secondary" text @click="loadBoard" />
      </div>
    </div>

    <div v-if="loading" class="flex justify-content-center p-6">
      <i class="pi pi-spin pi-spinner text-4xl text-color-secondary" />
    </div>

    <div v-else-if="!board" class="text-center text-color-secondary p-6">
      {{ $t('boards.empty') }}
    </div>

    <div v-else class="board-container">
      <Message v-if="hasNoColumns" severity="warn" class="mb-3 w-full">
        <div class="flex align-items-center justify-content-between flex-wrap gap-2">
          <span>{{ $t('boards.noColumns') }}</span>
          <Button
            v-if="canAdministerProject && project?.default_workflow_id"
            :label="$t('boards.rebuildBoard')"
            icon="pi pi-wrench"
            size="small"
            :loading="rebuilding"
            @click="rebuildBoard"
          />
        </div>
      </Message>

      <Message v-else-if="showNoTicketsHint" severity="info" class="mb-3 w-full">
        <div class="flex align-items-center justify-content-between flex-wrap gap-2">
          <span>{{ $t('boards.noTicketsOnBoard') }}</span>
          <Button
            v-if="canAdministerProject && project?.default_workflow_id"
            :label="$t('boards.rebuildBoard')"
            icon="pi pi-wrench"
            size="small"
            severity="secondary"
            :loading="rebuilding"
            @click="rebuildBoard"
          />
        </div>
      </Message>

      <div v-if="assigneesOnBoard.length > 0" class="assignee-filter-bar mb-3">
        <span class="text-xs font-semibold text-color-secondary mr-2">{{ $t('tickets.assignee') }}:</span>
        <div class="flex align-items-center gap-2 flex-wrap">
          <button
            v-for="a in assigneesOnBoard"
            :key="a.id"
            class="assignee-chip"
            :class="{ 'assignee-chip--active': selectedAssigneeIds.has(a.id) }"
            @click="toggleAssigneeFilter(a.id)"
          >
            <Avatar
              v-if="a.avatar_url"
              :image="assetUrl(a.avatar_url)"
              shape="circle"
              class="flex-shrink-0"
              style="width: 1.5rem; height: 1.5rem"
            />
            <Avatar
              v-else
              :label="a.initials"
              shape="circle"
              class="flex-shrink-0 bg-primary-100 text-primary-700"
              style="width: 1.5rem; height: 1.5rem; font-size: 0.6rem"
            />
            <span class="text-xs font-medium">{{ a.name }}</span>
            <Tag :value="String(a.count)" severity="secondary" rounded class="text-xs ml-1" />
          </button>
          <Button
            v-if="selectedAssigneeIds.size > 0"
            icon="pi pi-filter-slash"
            severity="secondary"
            text
            rounded
            size="small"
            :aria-label="$t('common.clear')"
            @click="clearAssigneeFilter"
          />
        </div>
      </div>

      <div v-for="lane in swimlanes" :key="lane.key" class="swimlane-group">
        <div v-if="lane.label" class="swimlane-header">
          <div class="flex align-items-center gap-2">
            <template v-if="swimlaneMode === 'assignee' && lane.key !== '_unassigned'">
              <Avatar
                v-if="memberMap.get(lane.key)?.avatar_url"
                :image="assetUrl(memberMap.get(lane.key)!.avatar_url!)"
                shape="circle"
                class="flex-shrink-0"
                style="width: 1.75rem; height: 1.75rem"
              />
              <Avatar
                v-else
                :label="memberInitials(lane.key)"
                shape="circle"
                class="flex-shrink-0 bg-primary-100 text-primary-700"
                style="width: 1.75rem; height: 1.75rem; font-size: 0.65rem"
              />
            </template>
            <span class="font-semibold text-sm text-color-secondary">{{ lane.label }}</span>
          </div>
        </div>
        <div class="board-columns-scroll">
          <div class="board-columns">
            <div
              v-for="col in lane.columns"
              :key="col.id"
              class="board-column"
              :class="{ 'drag-over': dragOverColumn === col.workflow_status_id }"
              @dragover="onDragOver(col.workflow_status_id, $event)"
              @dragleave="onDragLeave"
              @drop="onDrop(col.workflow_status_id, $event)"
            >
              <div class="column-header" :style="workflowColumnHeaderStyle(col.color)">
                <div class="flex align-items-center gap-2">
                  <div
                    class="status-dot"
                    :style="{ background: col.color }"
                  />
                  <span class="font-semibold text-sm">{{ col.name }}</span>
                  <Tag :value="String(col.tickets.length)" severity="secondary" rounded class="text-xs" />
                </div>
                <span v-if="col.wip_limit" class="text-xs text-color-secondary">
                  {{ $t('boards.wipLimit') }}: {{ col.wip_limit }}
                </span>
              </div>

              <div class="column-body">
              <div
                v-for="ticket in col.tickets"
                :key="ticket.id"
                class="ticket-card surface-card border-round shadow-1 p-3 mb-2 cursor-pointer"
                draggable="true"
                @dragstart="onDragStart(ticket, $event)"
                @click="goToTicket(ticket)"
              >
                <div class="flex align-items-center gap-2 mb-1">
                  <Tag :value="ticket.ticket_key" severity="info" class="text-xs" />
                  <i :class="[priorityIcon(ticket.priority), priorityClass(ticket.priority)]" style="font-size: 0.8rem" />
                </div>
                <div class="text-sm font-medium mb-2 ticket-card-title">{{ ticket.title }}</div>
                <div class="flex align-items-center justify-content-between">
                  <Tag :value="ticket.ticket_type" severity="secondary" class="text-xs" />
                  <div class="flex align-items-center gap-2">
                    <span v-if="ticket.story_points != null" class="text-xs text-color-secondary bg-surface-100 px-2 py-1 border-round">
                      {{ ticket.story_points }} pts
                    </span>
                    <Avatar
                      v-if="ticket.assignee_id"
                      icon="pi pi-user"
                      shape="circle"
                      class="bg-primary-100 text-primary-700"
                      style="width: 1.5rem; height: 1.5rem; font-size: 0.65rem"
                    />
                  </div>
                </div>
              </div>

              <div v-if="col.tickets.length === 0" class="text-center text-color-secondary text-xs p-3">
                {{ $t('boards.dropHere') }}
              </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.board-container {
  padding-bottom: 1rem;
  max-width: 100%;
  min-width: 0;
  overflow-x: hidden;
}

.swimlane-group {
  max-width: 100%;
  min-width: 0;
}

.assignee-filter-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.25rem;
  padding: 0.5rem 0;
}

.assignee-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.6rem;
  border-radius: 2rem;
  border: 1px solid var(--p-content-border-color, #e2e8f0);
  background: var(--p-content-background);
  cursor: pointer;
  transition: all 0.15s;
  line-height: 1;
}

.assignee-chip:hover {
  background: var(--p-surface-100, #f1f5f9);
  border-color: var(--p-primary-300, #93c5fd);
}

.assignee-chip--active {
  background: var(--p-primary-50, #eff6ff);
  border-color: var(--p-primary-color, #6366f1);
  box-shadow: 0 0 0 1px var(--p-primary-color, #6366f1);
}

.swimlane-group + .swimlane-group {
  margin-top: 1rem;
  border-top: 2px solid var(--p-surface-100, #e2e8f0);
  padding-top: 0.75rem;
}

.swimlane-header {
  padding: 0.25rem 0 0.5rem;
}

.board-columns-scroll {
  overflow-x: auto;
  overflow-y: visible;
  max-width: 100%;
  padding-bottom: 0.25rem;
}

.board-columns {
  display: inline-flex;
  gap: 0.75rem;
  min-height: 20vh;
  vertical-align: top;
}

.board-column {
  flex: 0 0 280px;
  min-width: 280px;
  background: var(--app-card-alt-bg);
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: box-shadow 0.15s;
}

.board-column.drag-over {
  box-shadow: inset 0 0 0 2px var(--p-primary-color, #6366f1);
}

.column-header {
  padding: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  border-radius: 8px 8px 0 0;
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.column-body {
  padding: 0.5rem;
  flex: 1;
  overflow-y: auto;
}

.ticket-card {
  transition: box-shadow 0.15s, transform 0.1s;
  border: 1px solid var(--p-content-border-color, #e2e8f0);
}

.ticket-card:hover {
  box-shadow: 0 2px 8px var(--shadow-color);
  transform: translateY(-1px);
}

.ticket-card-title {
  word-break: break-word;
  line-height: 1.3;
}
</style>
