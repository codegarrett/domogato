<template>
  <div class="ticket-list-view">
    <div v-if="loadingProject" class="flex justify-content-center align-items-center p-6">
      <ProgressSpinner style="width: 3rem; height: 3rem" strokeWidth="4" />
    </div>

    <template v-else-if="project">
      <div class="surface-card p-4 border-round shadow-1 mb-4">
        <div class="flex flex-column md:flex-row md:align-items-center md:justify-content-between gap-3">
          <div class="flex align-items-center gap-3 flex-wrap">
            <Tag :value="project.key" severity="info" class="text-lg font-semibold" />
            <h1 class="m-0 text-2xl font-semibold">{{ project.name }}</h1>
          </div>
          <div class="flex gap-2">
            <Button
              v-if="selectedTickets.length > 0"
              :label="$t('tickets.bulkEdit', { n: selectedTickets.length })"
              icon="pi pi-pencil"
              severity="secondary"
              outlined
              size="small"
              @click="bulkDialogVisible = true"
            />
            <Button
              :label="$t('import.title')"
              icon="pi pi-upload"
              severity="secondary"
              outlined
              size="small"
              @click="$router.push({ name: 'import-tickets', params: { projectId: route.params.projectId } })"
            />
            <Button
              :label="$t('tickets.exportCsv')"
              icon="pi pi-download"
              severity="secondary"
              outlined
              size="small"
              :loading="exporting"
              @click="exportCsv"
            />
            <Button :label="$t('tickets.createTicket')" icon="pi pi-plus" @click="openCreateDialog" />
          </div>
        </div>
      </div>

      <div class="surface-card p-4 border-round shadow-1">
        <!-- Saved views bar -->
        <div v-if="savedViews.length > 0 || activeViewId" class="flex align-items-center gap-2 mb-3 flex-wrap">
          <span class="text-color-secondary text-xs font-semibold" style="letter-spacing:0.04em;">{{ $t('tickets.views') }}:</span>
          <Button
            v-for="v in savedViews"
            :key="v.id"
            :label="v.name"
            size="small"
            :severity="activeViewId === v.id ? 'primary' : 'secondary'"
            :outlined="activeViewId !== v.id"
            @click="applySavedView(v)"
          />
          <Button
            v-if="activeViewId"
            icon="pi pi-times"
            size="small"
            severity="secondary"
            text
            rounded
            :title="$t('common.clear')"
            @click="clearSavedView"
          />
        </div>

        <div class="grid mb-4">
          <div class="col-12 md:col-4">
            <label for="ticket-search" class="block text-color-secondary text-sm mb-2">{{ $t('common.search') }}</label>
            <InputText
              id="ticket-search"
              v-model="searchInput"
              class="w-full"
              :placeholder="$t('tickets.searchPlaceholder')"
              @keyup.enter="applyFilters"
            />
          </div>
          <div class="col-12 md:col-3">
            <label for="filter-type" class="block text-color-secondary text-sm mb-2">{{ $t('tickets.type') }}</label>
            <Select
              id="filter-type"
              v-model="filterTicketType"
              :options="ticketTypeFilterOptions"
              option-label="label"
              option-value="value"
              :placeholder="$t('tickets.allTypes')"
              class="w-full"
              show-clear
            />
          </div>
          <div class="col-12 md:col-3">
            <label for="filter-priority" class="block text-color-secondary text-sm mb-2">{{ $t('tickets.priority') }}</label>
            <Select
              id="filter-priority"
              v-model="filterPriority"
              :options="priorityFilterOptions"
              option-label="label"
              option-value="value"
              :placeholder="$t('tickets.allPriorities')"
              class="w-full"
              show-clear
            />
          </div>
          <div class="col-12 md:col-2 flex align-items-end gap-2">
            <Button :label="$t('common.clear')" icon="pi pi-filter-slash" class="w-full md:w-auto" outlined size="small" @click="clearFilters" />
            <Button icon="pi pi-save" severity="secondary" text rounded size="small" :title="$t('tickets.saveView')" @click="saveViewDialogVisible = true" />
          </div>
        </div>

        <div class="flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
          <span class="text-color-secondary text-sm">
            {{ total === 0 ? $t('tickets.noTickets') : $t('tickets.showing', { from: first + 1, to: Math.min(first + rows, total), total }) }}
          </span>
        </div>

        <DataTable
          v-model:selection="selectedTickets"
          :value="tickets"
          :loading="loadingTickets"
          lazy
          paginator
          :rows="rows"
          :first="first"
          :total-records="total"
          data-key="id"
          striped-rows
          scrollable
          scroll-height="65vh"
          class="p-datatable-sm"
          :rows-per-page-options="[25, 50, 100]"
          @page="onPage"
        >
          <template #loading>
            <div class="flex justify-content-center p-5">
              <ProgressSpinner style="width: 2.5rem; height: 2.5rem" strokeWidth="4" />
            </div>
          </template>
          <Column selection-mode="multiple" style="width: 3rem" />
          <Column field="ticket_key" :header="$t('projects.key')" style="width: 8rem">
            <template #body="{ data }">
              <router-link
                :to="`/tickets/${data.id}`"
                class="font-mono text-sm text-primary no-underline hover:underline"
                @click.stop
              >
                {{ data.ticket_key ?? '—' }}
              </router-link>
            </template>
          </Column>

          <Column field="title" :header="$t('tickets.title')">
            <template #body="{ data }">
              <div
                v-if="editingCell?.id === data.id && editingCell?.field === 'title'"
                class="flex align-items-center gap-2"
                @click.stop
              >
                <InputText
                  ref="inlineTitleRef"
                  v-model="editingCell.value"
                  class="w-full p-inputtext-sm"
                  @keydown.enter.prevent="commitInlineEdit(data)"
                  @keydown.escape="cancelInlineEdit"
                />
                <Button icon="pi pi-check" size="small" text rounded @click="commitInlineEdit(data)" />
                <Button icon="pi pi-times" size="small" text rounded severity="secondary" @click="cancelInlineEdit" />
              </div>
              <span
                v-else
                class="inline-editable"
                @click.stop="startInlineEdit(data, 'title', data.title)"
              >
                {{ data.title }}
              </span>
            </template>
          </Column>

          <Column field="ticket_type" :header="$t('tickets.type')" style="width: 8rem">
            <template #body="{ data }">
              <div
                v-if="editingCell?.id === data.id && editingCell?.field === 'ticket_type'"
                @click.stop
              >
                <Select
                  v-model="editingCell.value"
                  :options="ticketTypeFormOptions"
                  option-label="label"
                  option-value="value"
                  class="w-full p-inputtext-sm"
                  @update:model-value="commitInlineEdit(data)"
                />
              </div>
              <Tag
                v-else
                :value="formatLabel(data.ticket_type)"
                severity="secondary"
                class="cursor-pointer inline-editable-tag"
                @click.stop="startInlineEdit(data, 'ticket_type', data.ticket_type)"
              />
            </template>
          </Column>

          <Column field="priority" :header="$t('tickets.priority')" style="width: 8rem">
            <template #body="{ data }">
              <div
                v-if="editingCell?.id === data.id && editingCell?.field === 'priority'"
                @click.stop
              >
                <Select
                  v-model="editingCell.value"
                  :options="priorityFormOptions"
                  option-label="label"
                  option-value="value"
                  class="w-full p-inputtext-sm"
                  @update:model-value="commitInlineEdit(data)"
                />
              </div>
              <Tag
                v-else
                :value="formatLabel(data.priority)"
                :severity="prioritySeverity(data.priority)"
                class="cursor-pointer inline-editable-tag"
                @click.stop="startInlineEdit(data, 'priority', data.priority)"
              />
            </template>
          </Column>

          <Column field="assignee_id" :header="$t('tickets.assignee')" style="width: 12rem">
            <template #body="{ data }">
              <div
                v-if="editingCell?.id === data.id && editingCell?.field === 'assignee_id'"
                @click.stop
              >
                <Select
                  v-model="editingCell.value"
                  :options="assigneeOptions"
                  option-label="label"
                  option-value="value"
                  :placeholder="$t('tickets.unassigned')"
                  class="w-full p-inputtext-sm"
                  show-clear
                  @update:model-value="commitInlineEdit(data)"
                />
              </div>
              <span
                v-else
                class="text-sm inline-editable"
                @click.stop="startInlineEdit(data, 'assignee_id', data.assignee_id)"
              >
                {{ resolveAssigneeName(data.assignee_id) }}
              </span>
            </template>
          </Column>

          <Column field="workflow_status_id" :header="$t('common.status')" style="width: 12rem">
            <template #body="{ data }">
              <div
                v-if="editingCell?.id === data.id && editingCell?.field === 'workflow_status_id'"
                @click.stop
              >
                <Select
                  v-model="editingCell.value"
                  :options="statusTransitionOptions(data)"
                  option-label="label"
                  option-value="value"
                  class="w-full p-inputtext-sm"
                  @update:model-value="commitStatusTransition(data)"
                />
              </div>
              <Tag
                v-else
                :value="resolveStatusName(data.workflow_status_id)"
                :style="resolveStatusStyle(data.workflow_status_id)"
                class="cursor-pointer inline-editable-tag"
                @click.stop="startInlineEdit(data, 'workflow_status_id', data.workflow_status_id)"
              />
            </template>
          </Column>

          <Column field="created_at" :header="$t('common.created')" style="width: 11rem">
            <template #body="{ data }">
              <span class="text-sm">{{ formatDate(data.created_at) }}</span>
            </template>
          </Column>
        </DataTable>
      </div>
    </template>

    <div v-else class="flex justify-content-center p-6 text-color-secondary">{{ $t('tickets.projectNotFound') }}</div>

    <Dialog
      v-model:visible="createVisible"
      :header="$t('tickets.createTicket')"
      modal
      :style="{ width: '32rem', maxWidth: '95vw' }"
      :dismissable-mask="true"
      @hide="resetCreateForm"
    >
      <div class="flex flex-column gap-3 pt-2">
        <div>
          <label for="create-title" class="block text-sm mb-2">{{ $t('tickets.title') }} <span class="text-red-500">*</span></label>
          <InputText id="create-title" v-model="createForm.title" class="w-full" :invalid="createAttempted && !createForm.title.trim()" />
        </div>
        <div>
          <label for="create-desc" class="block text-sm mb-2">{{ $t('common.description') }}</label>
          <Textarea id="create-desc" v-model="createForm.description" class="w-full" rows="4" auto-resize />
        </div>
        <div>
          <label for="create-type" class="block text-sm mb-2">{{ $t('tickets.type') }}</label>
          <Select
            id="create-type"
            v-model="createForm.ticket_type"
            :options="ticketTypeFormOptions"
            option-label="label"
            option-value="value"
            class="w-full"
            :placeholder="$t('tickets.selectType')"
          />
        </div>
        <div>
          <label for="create-priority" class="block text-sm mb-2">{{ $t('tickets.priority') }}</label>
          <Select
            id="create-priority"
            v-model="createForm.priority"
            :options="priorityFormOptions"
            option-label="label"
            option-value="value"
            class="w-full"
            :placeholder="$t('tickets.selectPriority')"
          />
        </div>
        <div>
          <label for="create-epic" class="block text-sm mb-2">{{ $t('tickets.epic') }}</label>
          <Select
            id="create-epic"
            v-model="createForm.epic_id"
            :options="epicOptions"
            option-label="label"
            option-value="value"
            class="w-full"
            :placeholder="$t('tickets.noEpic')"
            show-clear
            :loading="loadingEpics"
          />
        </div>
        <div>
          <label for="create-points" class="block text-sm mb-2">{{ $t('tickets.storyPoints') }}</label>
          <InputNumber id="create-points" v-model="createForm.story_points" class="w-full" :min="0" :max="999" show-buttons />
        </div>
      </div>
      <template #footer>
        <Button :label="$t('common.cancel')" severity="secondary" text @click="createVisible = false" />
        <Button :label="$t('common.create')" icon="pi pi-check" :loading="creating" :disabled="!createForm.title.trim()" @click="submitCreate" />
      </template>
    </Dialog>
    <Dialog
      v-model:visible="bulkDialogVisible"
      :header="$t('tickets.bulkUpdate')"
      modal
      :style="{ width: '28rem', maxWidth: '95vw' }"
    >
      <div class="flex flex-column gap-3 pt-2">
        <div>
          <label class="block text-sm mb-2">{{ $t('tickets.priority') }}</label>
          <Select
            v-model="bulkPriority"
            :options="priorityFormOptions"
            option-label="label"
            option-value="value"
            class="w-full"
            show-clear
            :placeholder="$t('tickets.keepCurrent')"
          />
        </div>
        <div>
          <label class="block text-sm mb-2">{{ $t('tickets.type') }}</label>
          <Select
            v-model="bulkType"
            :options="ticketTypeFormOptions"
            option-label="label"
            option-value="value"
            class="w-full"
            show-clear
            :placeholder="$t('tickets.keepCurrent')"
          />
        </div>
      </div>
      <template #footer>
        <Button :label="$t('common.cancel')" severity="secondary" outlined @click="bulkDialogVisible = false" />
        <Button
          :label="$t('common.apply')"
          icon="pi pi-check"
          :loading="bulkSaving"
          :disabled="!bulkPriority && !bulkType"
          @click="submitBulkUpdate"
        />
      </template>
    </Dialog>

    <Dialog
      v-model:visible="saveViewDialogVisible"
      :header="$t('tickets.saveView')"
      modal
      :style="{ width: '24rem', maxWidth: '95vw' }"
    >
      <div class="flex flex-column gap-3 pt-2">
        <div>
          <label class="block text-sm mb-2">{{ $t('tickets.viewName') }}</label>
          <InputText v-model="saveViewName" class="w-full" autofocus />
        </div>
      </div>
      <template #footer>
        <Button :label="$t('common.cancel')" severity="secondary" text @click="saveViewDialogVisible = false" />
        <Button :label="$t('common.save')" icon="pi pi-check" :disabled="!saveViewName.trim()" @click="doSaveView" />
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import Dialog from 'primevue/dialog'
import InputNumber from 'primevue/inputnumber'
import Textarea from 'primevue/textarea'
import ProgressSpinner from 'primevue/progressspinner'
import {
  listTickets,
  createTicket,
  updateTicket,
  transitionStatus,
  bulkUpdateTickets,
  exportTicketsCsv,
  type Ticket,
  type TicketCreate,
} from '@/api/tickets'
import { listEpics, type Epic } from '@/api/epics'
import { listSavedViews, createSavedView, type SavedView } from '@/api/saved-views'
import { getProject, listProjectMembers, type Project, type ProjectMember } from '@/api/projects'
import { listWorkflows, type Workflow, type WorkflowStatus } from '@/api/workflows'
import { useWebSocket } from '@/composables/useWebSocket'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

const projectId = computed(() => route.params.projectId as string)

const project = ref<Project | null>(null)
const loadingProject = ref(true)

const tickets = ref<Ticket[]>([])
const total = ref(0)
const first = ref(0)
const rows = ref(50)
const loadingTickets = ref(false)

const searchInput = ref('')
const appliedSearch = ref('')
const filterTicketType = ref<string | null>(null)
const filterPriority = ref<string | null>(null)

const epics = ref<Epic[]>([])
const loadingEpics = ref(false)

const members = ref<ProjectMember[]>([])
const workflows = ref<Workflow[]>([])

const createVisible = ref(false)
const creating = ref(false)
const createAttempted = ref(false)
const createForm = ref({
  title: '',
  description: '',
  ticket_type: 'task',
  priority: 'medium',
  epic_id: null as string | null,
  story_points: null as number | null,
})

const selectedTickets = ref<Ticket[]>([])
const bulkDialogVisible = ref(false)
const bulkPriority = ref<string | null>(null)
const bulkType = ref<string | null>(null)
const bulkSaving = ref(false)
const exporting = ref(false)

const savedViews = ref<SavedView[]>([])
const activeViewId = ref<string | null>(null)
const saveViewDialogVisible = ref(false)
const saveViewName = ref('')

async function loadSavedViews() {
  try {
    savedViews.value = await listSavedViews(projectId.value)
  } catch {
    savedViews.value = []
  }
}

function applySavedView(view: SavedView) {
  activeViewId.value = view.id
  const f = view.filters as Record<string, unknown>
  searchInput.value = (f.search as string) || ''
  appliedSearch.value = searchInput.value
  filterTicketType.value = (f.ticket_type as string) || null
  filterPriority.value = (f.priority as string) || null
  first.value = 0
  loadTickets()
}

function clearSavedView() {
  activeViewId.value = null
  clearFilters()
}

async function doSaveView() {
  const name = saveViewName.value.trim()
  if (!name) return
  const filters: Record<string, unknown> = {}
  if (appliedSearch.value.trim()) filters.search = appliedSearch.value.trim()
  if (filterTicketType.value) filters.ticket_type = filterTicketType.value
  if (filterPriority.value) filters.priority = filterPriority.value
  try {
    const created = await createSavedView(projectId.value, { name, filters })
    savedViews.value.push(created)
    activeViewId.value = created.id
    saveViewDialogVisible.value = false
    saveViewName.value = ''
  } catch {
    /* handled by interceptor */
  }
}

interface InlineEdit {
  id: string
  field: string
  value: unknown
}
const editingCell = ref<InlineEdit | null>(null)
const inlineTitleRef = ref<InstanceType<typeof InputText> | null>(null)

const TICKET_TYPES = ['task', 'bug', 'story', 'epic', 'subtask'] as const
const PRIORITIES = ['highest', 'high', 'medium', 'low', 'lowest'] as const

const ticketTypeFilterOptions = computed(() =>
  TICKET_TYPES.map((v) => ({ label: formatLabel(v), value: v })),
)
const priorityFilterOptions = computed(() =>
  PRIORITIES.map((v) => ({ label: formatLabel(v), value: v })),
)
const ticketTypeFormOptions = ticketTypeFilterOptions
const priorityFormOptions = priorityFilterOptions

const epicOptions = computed(() =>
  epics.value.map((e) => ({ label: e.title, value: e.id })),
)

const assigneeOptions = computed(() => [
  ...members.value.map((m) => ({
    label: m.display_name || m.email,
    value: m.user_id,
  })),
])

const memberMap = computed(() => {
  const map = new Map<string, string>()
  for (const m of members.value) {
    map.set(m.user_id, m.display_name || m.email)
  }
  return map
})

const statusMap = computed(() => {
  const map = new Map<string, WorkflowStatus>()
  for (const wf of workflows.value) {
    for (const s of wf.statuses) {
      map.set(s.id, s)
    }
  }
  return map
})

function resolveAssigneeName(id: string | null): string {
  if (!id) return '—'
  return memberMap.value.get(id) ?? '—'
}

function resolveStatusName(id: string): string {
  return statusMap.value.get(id)?.name ?? '—'
}

function resolveStatusStyle(id: string): Record<string, string> {
  const s = statusMap.value.get(id)
  if (!s?.color) return {}
  return { background: s.color, color: '#fff', borderColor: s.color }
}

function formatLabel(s: string) {
  if (!s) return ''
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function prioritySeverity(priority: string): 'danger' | 'warning' | 'info' | 'success' | 'secondary' {
  switch (priority) {
    case 'highest':
      return 'danger'
    case 'high':
      return 'warning'
    case 'medium':
      return 'info'
    case 'low':
      return 'success'
    case 'lowest':
      return 'secondary'
    default:
      return 'secondary'
  }
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return iso
  }
}

function startInlineEdit(row: Ticket, field: string, currentValue: unknown) {
  editingCell.value = { id: row.id, field, value: currentValue }
  if (field === 'title') {
    void nextTick(() => {
      const root = inlineTitleRef.value as { $el?: HTMLElement } | null
      const el = root?.$el
      const input = (el?.tagName === 'INPUT' ? el : el?.querySelector?.('input')) as HTMLInputElement | null
      input?.focus()
      input?.select()
    })
  }
}

function cancelInlineEdit() {
  editingCell.value = null
}

async function commitInlineEdit(row: Ticket) {
  const cell = editingCell.value
  if (!cell) return
  const newVal = cell.value

  if (cell.field === 'title') {
    const trimmed = (newVal as string).trim()
    if (!trimmed || trimmed === row.title) {
      cancelInlineEdit()
      return
    }
    try {
      const updated = await updateTicket(row.id, { title: trimmed })
      applyTicketPatch(row.id, updated)
    } catch (e) {
      console.error(e)
    }
  } else if (cell.field === 'ticket_type') {
    if (newVal === row.ticket_type) { cancelInlineEdit(); return }
    try {
      const updated = await updateTicket(row.id, { ticket_type: newVal as string })
      applyTicketPatch(row.id, updated)
    } catch (e) {
      console.error(e)
    }
  } else if (cell.field === 'priority') {
    if (newVal === row.priority) { cancelInlineEdit(); return }
    try {
      const updated = await updateTicket(row.id, { priority: newVal as string })
      applyTicketPatch(row.id, updated)
    } catch (e) {
      console.error(e)
    }
  } else if (cell.field === 'assignee_id') {
    const next = (newVal as string | null) ?? null
    if (next === row.assignee_id) { cancelInlineEdit(); return }
    try {
      const updated = await updateTicket(row.id, { assignee_id: next })
      applyTicketPatch(row.id, updated)
    } catch (e) {
      console.error(e)
    }
  }

  cancelInlineEdit()
}

async function commitStatusTransition(row: Ticket) {
  const cell = editingCell.value
  if (!cell) return
  const newStatusId = cell.value as string
  if (newStatusId === row.workflow_status_id) {
    cancelInlineEdit()
    return
  }
  try {
    const updated = await transitionStatus(row.id, { workflow_status_id: newStatusId })
    applyTicketPatch(row.id, updated)
  } catch (e) {
    console.error(e)
  }
  cancelInlineEdit()
}

function statusTransitionOptions(row: Ticket): { label: string; value: string }[] {
  const currentStatus = statusMap.value.get(row.workflow_status_id)
  const opts: { label: string; value: string }[] = []

  if (currentStatus) {
    opts.push({ label: `${currentStatus.name} (${t('common.current')})`, value: currentStatus.id })
  }

  for (const wf of workflows.value) {
    const hasStatus = wf.statuses.some(s => s.id === row.workflow_status_id)
    if (!hasStatus) continue
    for (const tr of wf.transitions) {
      if (tr.from_status_id !== row.workflow_status_id) continue
      const target = statusMap.value.get(tr.to_status_id)
      if (target) {
        opts.push({ label: target.name, value: target.id })
      }
    }
  }

  return opts
}

function applyTicketPatch(ticketId: string, updated: Ticket) {
  tickets.value = tickets.value.map(t => t.id === ticketId ? updated : t)
}

async function loadProject() {
  loadingProject.value = true
  try {
    project.value = await getProject(projectId.value)
  } catch {
    project.value = null
  } finally {
    loadingProject.value = false
  }
}

async function loadEpics() {
  loadingEpics.value = true
  try {
    const res = await listEpics(projectId.value, 0, 200)
    epics.value = res.items
  } catch {
    epics.value = []
  } finally {
    loadingEpics.value = false
  }
}

async function loadMembers() {
  try {
    const res = await listProjectMembers(projectId.value, 0, 200)
    members.value = res.items
  } catch {
    members.value = []
  }
}

async function loadWorkflows() {
  if (!project.value) return
  try {
    const res = await listWorkflows(project.value.organization_id, 0, 100)
    workflows.value = res.items
  } catch {
    workflows.value = []
  }
}

async function loadTickets() {
  loadingTickets.value = true
  try {
    const res = await listTickets(projectId.value, {
      offset: first.value,
      limit: rows.value,
      ...(appliedSearch.value.trim() ? { search: appliedSearch.value.trim() } : {}),
      ...(filterTicketType.value ? { ticket_type: filterTicketType.value } : {}),
      ...(filterPriority.value ? { priority: filterPriority.value } : {}),
    })
    tickets.value = res.items
    total.value = res.total
  } catch {
    tickets.value = []
    total.value = 0
  } finally {
    loadingTickets.value = false
  }
}

function onPage(e: { first: number; rows: number }) {
  first.value = e.first
  rows.value = e.rows
  loadTickets()
}

function applyFilters() {
  appliedSearch.value = searchInput.value
  first.value = 0
  loadTickets()
}

function clearFilters() {
  searchInput.value = ''
  appliedSearch.value = ''
  filterTicketType.value = null
  filterPriority.value = null
  first.value = 0
  loadTickets()
}

function openCreateDialog() {
  createAttempted.value = false
  resetCreateForm()
  createVisible.value = true
}

function resetCreateForm() {
  createForm.value = {
    title: '',
    description: '',
    ticket_type: 'task',
    priority: 'medium',
    epic_id: null,
    story_points: null,
  }
}

async function submitCreate() {
  createAttempted.value = true
  if (!createForm.value.title.trim()) return
  creating.value = true
  try {
    const payload: TicketCreate = {
      title: createForm.value.title.trim(),
      description: createForm.value.description.trim() || null,
      ticket_type: createForm.value.ticket_type,
      priority: createForm.value.priority,
      epic_id: createForm.value.epic_id,
      story_points: createForm.value.story_points,
    }
    await createTicket(projectId.value, payload)
    createVisible.value = false
    await loadTickets()
  } finally {
    creating.value = false
  }
}

async function submitBulkUpdate() {
  if (selectedTickets.value.length === 0) return
  bulkSaving.value = true
  try {
    const payload: Record<string, unknown> = {
      ticket_ids: selectedTickets.value.map(t => t.id),
    }
    if (bulkPriority.value) payload.priority = bulkPriority.value
    if (bulkType.value) payload.ticket_type = bulkType.value
    await bulkUpdateTickets(projectId.value, payload as { ticket_ids: string[] })
    bulkDialogVisible.value = false
    selectedTickets.value = []
    bulkPriority.value = null
    bulkType.value = null
    await loadTickets()
  } finally {
    bulkSaving.value = false
  }
}

async function exportCsv() {
  exporting.value = true
  try {
    await exportTicketsCsv(projectId.value)
  } finally {
    exporting.value = false
  }
}

watch(
  () => projectId.value,
  async () => {
    searchInput.value = ''
    appliedSearch.value = ''
    filterTicketType.value = null
    filterPriority.value = null
    first.value = 0
    await loadProject()
    if (project.value) {
      await Promise.all([loadEpics(), loadTickets(), loadMembers(), loadWorkflows()])
    } else {
      tickets.value = []
      total.value = 0
      epics.value = []
      members.value = []
      workflows.value = []
    }
  },
)

watch([filterTicketType, filterPriority], () => {
  if (!project.value) return
  first.value = 0
  loadTickets()
})

let searchDebounce: ReturnType<typeof setTimeout> | null = null
watch(searchInput, () => {
  if (searchDebounce) clearTimeout(searchDebounce)
  searchDebounce = setTimeout(() => {
    appliedSearch.value = searchInput.value
    first.value = 0
    if (project.value) loadTickets()
  }, 350)
})

const ws = useWebSocket()
let refreshTimer: ReturnType<typeof setTimeout> | null = null

function scheduleRefresh() {
  if (refreshTimer) clearTimeout(refreshTimer)
  refreshTimer = setTimeout(() => {
    loadTickets()
    refreshTimer = null
  }, 500)
}

function onWsEvent(data: Record<string, unknown>) {
  const event = data.event as string | undefined
  if (!event) return
  if (event.startsWith('ticket.')) {
    scheduleRefresh()
  }
}

onMounted(async () => {
  await loadProject()
  if (project.value) {
    await Promise.all([loadEpics(), loadTickets(), loadMembers(), loadWorkflows(), loadSavedViews()])
    ws.subscribe(`project:${projectId.value}`)
    ws.on('event', onWsEvent)
  }
})

onUnmounted(() => {
  ws.unsubscribe(`project:${projectId.value}`)
  ws.off('event', onWsEvent)
  if (refreshTimer) clearTimeout(refreshTimer)
})
</script>

<style scoped>
.ticket-list-view :deep(.p-datatable tbody tr) {
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
