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
              v-if="canAdministerProject && selectedTickets.length > 0"
              :label="$t('tickets.deleteSelected', { n: selectedTickets.length })"
              icon="pi pi-trash"
              severity="danger"
              outlined
              size="small"
              @click="deleteDialogVisible = true"
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
              @click="exportDialogVisible = true"
            />
            <Button
              v-if="canCreateTicket"
              :label="$t('tickets.createTicket')"
              icon="pi pi-plus"
              data-testid="create-ticket"
              @click="openCreateDialog"
            />
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
          <label class="flex align-items-center gap-2 text-sm cursor-pointer">
            <Checkbox v-model="includeSubtasks" binary />
            <span>{{ $t('tickets.includeSubtasks') }}</span>
          </label>
        </div>

        <TicketTable
          :tickets="tickets"
          :columns="LIST_COLUMNS"
          :project-id="projectId"
          :loading="loadingTickets"
          :empty-text="$t('tickets.noTickets')"
          :sort-column="sortColumn"
          :sort-direction="sortDirection"
          :selected-ids="selectedTicketIds"
          :editable-title="canUpdateTicket"
          :editing-id="editingCell?.id ?? null"
          :editing-field="editingCell?.field ?? null"
          :edit-value="editingCell?.value ?? null"
          :type-options="ticketTypeFormOptions"
          :priority-options="priorityFormOptions"
          :assignee-options="assigneeOptions"
          :status-options-for="statusTransitionOptions"
          :resolve-assignee-name="resolveAssigneeName"
          :resolve-status-name="resolveStatusName"
          :resolve-status-style="resolveStatusStyle"
          :format-label="formatLabel"
          :priority-severity="prioritySeverity"
          :story-points-model="storyPointsEditModel"
          :ticket-key-label="(tk) => displayTicketKey(tk, project?.key)"
          :format-date="formatDate"
          @sort="onSortColumn"
          @toggle-select="toggleSelect"
          @toggle-select-all="toggleSelectAllOnPage"
          @start-edit="(tk, field, value) => handleStartEdit(tk, field, value)"
          @commit-edit="(tk) => commitEdit(tk)"
          @commit-status="(tk, statusId) => commitStatusEdit(tk, statusId)"
          @cancel-edit="cancelEdit"
          @update:edit-value="onEditValueUpdate"
          @update:story-points-model="(v) => { if (editingCell) editingCell.value = v }"
        />

        <Paginator
          v-if="total > 0"
          class="mt-3"
          :first="first"
          :rows="rows"
          :total-records="total"
          :rows-per-page-options="[25, 50, 100]"
          @page="onPage"
        />
      </div>
    </template>

    <div v-else class="flex justify-content-center p-6 text-color-secondary">{{ $t('tickets.projectNotFound') }}</div>

    <Dialog
      v-model:visible="createVisible"
      modal
      :style="{ width: '36rem', maxWidth: '95vw' }"
      :dismissable-mask="true"
      @hide="resetCreateForm"
    >
      <template #header>
        <div class="flex align-items-center justify-content-between w-full gap-2 pr-2">
          <span class="font-semibold">{{ $t('tickets.createTicket') }}</span>
          <AiSparklesButton :loading="aiGenerating" @click="openAiGenerateDialog" />
        </div>
      </template>
      <div class="flex flex-column gap-3 pt-2">
        <div>
          <label for="create-title" class="block text-sm mb-2">{{ $t('tickets.title') }} <span class="text-red-500">*</span></label>
          <InputText id="create-title" v-model="createForm.title" class="w-full" :invalid="createAttempted && !createForm.title.trim()" />
        </div>
        <div>
          <MarkdownEditor
            id="create-desc"
            v-model="createForm.description"
            :label="$t('common.description')"
            :rows="8"
            :placeholder="$t('tickets.descriptionPlaceholder')"
          />
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
          <label for="create-assignee" class="block text-sm mb-2">{{ $t('tickets.assignee') }}</label>
          <Select
            id="create-assignee"
            v-model="createForm.assignee_id"
            :options="assigneeOptions"
            option-label="label"
            option-value="value"
            class="w-full"
            :placeholder="$t('tickets.unassigned')"
            show-clear
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

    <AiGeneratePromptDialog
      v-model:visible="aiDialogOpen"
      v-model:prompt="aiPrompt"
      :loading="aiGenerating"
      :error="aiGenerateError"
      :hint="$t('contentAssist.ticketCreateHint')"
      @generate="runAiGenerate"
    />

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

    <TicketBulkDeleteDialog
      v-model:visible="deleteDialogVisible"
      :selected-tickets="selectedTickets"
      :loading="deletingTickets"
      @confirm="submitBulkDelete"
    />

    <TicketExportDialog
      v-model:visible="exportDialogVisible"
      :selected-tickets="selectedTickets"
      :status-options="exportStatusOptions"
      :loading="exporting"
      @confirm="submitExport"
    />

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
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Tag from 'primevue/tag'
import Button from 'primevue/button'
import Paginator from 'primevue/paginator'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import Dialog from 'primevue/dialog'
import InputNumber from 'primevue/inputnumber'
import ProgressSpinner from 'primevue/progressspinner'
import MarkdownEditor from '@/components/common/MarkdownEditor.vue'
import AiSparklesButton from '@/components/ai/AiSparklesButton.vue'
import AiGeneratePromptDialog from '@/components/ai/AiGeneratePromptDialog.vue'
import { useContentAssist } from '@/composables/useContentAssist'
import { sanitizeMarkdownInput } from '@/utils/richContent'
import Checkbox from 'primevue/checkbox'
import {
  listTickets,
  createTicket,
  bulkUpdateTickets,
  deleteTicket,
  exportTickets,
  type Ticket,
  type TicketCreate,
} from '@/api/tickets'
import TicketBulkDeleteDialog from '@/components/tickets/TicketBulkDeleteDialog.vue'
import TicketExportDialog from '@/components/tickets/TicketExportDialog.vue'
import { useProjectAdmin } from '@/composables/useProjectAdmin'
import { useProjectPermissions } from '@/composables/usePermissions'
import { useToastService } from '@/composables/useToast'
import { orderedDeleteIds } from '@/utils/collectTicketsForDelete'
import { listEpics, type Epic } from '@/api/epics'
import { listSavedViews, createSavedView, type SavedView } from '@/api/saved-views'
import { getProject, type Project } from '@/api/projects'
import { useProjectTicketMeta } from '@/composables/useProjectTicketMeta'
import { useWebSocket } from '@/composables/useWebSocket'
import { useTicketTableInlineEdit } from '@/composables/useTicketTableInlineEdit'
import TicketTable from '@/components/tickets/TicketTable/TicketTable.vue'
import { LIST_COLUMNS } from '@/components/tickets/TicketTable/types'
import { displayTicketKey } from '@/utils/displayTicketKey'
import {
  DEFAULT_TICKET_SORT_COLUMN,
  DEFAULT_TICKET_SORT_DIRECTION,
  sortColumnToApiParams,
  toggleTicketSort,
  type TicketSortColumn,
  type SortDirection,
} from '@/utils/ticketTableSort'

const route = useRoute()
const { t } = useI18n()
const toast = useToastService()

const projectId = computed(() => route.params.projectId as string)
const organizationId = computed(() => project.value?.organization_id)
const { canAdministerProject } = useProjectAdmin(projectId, organizationId)
const {
  canCreateTicket,
  canUpdateTicket,
  canEditTicketField,
} = useProjectPermissions(projectId)

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
const includeSubtasks = ref(false)

const epics = ref<Epic[]>([])
const loadingEpics = ref(false)

const {
  workflows,
  assigneeOptions,
  resolveAssigneeName,
  resolveStatusName,
  resolveStatusStyle,
  statusTransitionOptions,
  loadMembers,
  loadWorkflows,
} = useProjectTicketMeta(() => projectId.value, project)

const exportStatusOptions = computed(() => {
  const byName = new Map<string, { name: string; ids: string[] }>()
  for (const wf of workflows.value) {
    for (const s of wf.statuses) {
      const key = s.name.trim().toLowerCase()
      const existing = byName.get(key)
      if (existing) {
        if (!existing.ids.includes(s.id)) {
          existing.ids.push(s.id)
        }
      } else {
        byName.set(key, { name: s.name, ids: [s.id] })
      }
    }
  }
  return [...byName.entries()]
    .map(([key, { name, ids }]) => ({ key, name, ids }))
    .sort((a, b) => a.name.localeCompare(b.name))
})

const {
  generating: aiGenerating,
  generateError: aiGenerateError,
  generateContent: runContentGenerate,
} = useContentAssist()

const aiDialogOpen = ref(false)
const aiPrompt = ref('')

const createVisible = ref(false)
const creating = ref(false)
const createAttempted = ref(false)
const createForm = ref({
  title: '',
  description: '',
  ticket_type: 'task',
  priority: 'medium',
  assignee_id: null as string | null,
  epic_id: null as string | null,
  story_points: null as number | null,
})

const selectedTickets = ref<Ticket[]>([])
const selectedTicketIds = computed(() => new Set(selectedTickets.value.map((t) => t.id)))

const sortColumn = ref<TicketSortColumn>(DEFAULT_TICKET_SORT_COLUMN)
const sortDirection = ref<SortDirection>(DEFAULT_TICKET_SORT_DIRECTION)

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
    tickets.value = tickets.value.map((t) => (t.id === updated.id ? updated : t))
  },
})

function handleStartEdit(ticket: Ticket, field: string, value: string | number | null) {
  if (!canEditTicketField(field)) return
  startEdit(ticket, field, value)
}

function toggleSelect(ticket: Ticket) {
  const idx = selectedTickets.value.findIndex((t) => t.id === ticket.id)
  if (idx >= 0) selectedTickets.value.splice(idx, 1)
  else selectedTickets.value.push(ticket)
}

async function submitBulkDelete(options: { deleteSubtasks: boolean }) {
  if (selectedTickets.value.length === 0) return
  deletingTickets.value = true
  const ids = await orderedDeleteIds(selectedTickets.value, options.deleteSubtasks)
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
    await loadTickets()
  } catch {
    toast.showError(t('common.error'), t('tickets.deleteFailed'))
  } finally {
    deletingTickets.value = false
  }
}

function toggleSelectAllOnPage() {
  if (tickets.value.length === 0) return
  const allOnPage = tickets.value.every((t) => selectedTicketIds.value.has(t.id))
  if (allOnPage) {
    const pageIds = new Set(tickets.value.map((t) => t.id))
    selectedTickets.value = selectedTickets.value.filter((t) => !pageIds.has(t.id))
  } else {
    const seen = new Set(selectedTickets.value.map((t) => t.id))
    for (const tk of tickets.value) {
      if (!seen.has(tk.id)) {
        selectedTickets.value.push(tk)
        seen.add(tk.id)
      }
    }
  }
}

function onSortColumn(column: TicketSortColumn) {
  const next = toggleTicketSort(column, sortColumn.value, sortDirection.value)
  sortColumn.value = next.column
  sortDirection.value = next.direction
  first.value = 0
  loadTickets()
}
const bulkDialogVisible = ref(false)
const deleteDialogVisible = ref(false)
const deletingTickets = ref(false)
const bulkPriority = ref<string | null>(null)
const bulkType = ref<string | null>(null)
const bulkSaving = ref(false)
const exportDialogVisible = ref(false)
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

function formatLabel(s: string) {
  if (!s) return ''
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function prioritySeverity(priority: string): 'danger' | 'warn' | 'info' | 'success' | 'secondary' {
  switch (priority) {
    case 'highest':
      return 'danger'
    case 'high':
      return 'warn'
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

function isTopLevelTicket(tk: Ticket): boolean {
  return !tk.parent_ticket_id && tk.ticket_type !== 'subtask'
}

async function loadTickets() {
  loadingTickets.value = true
  try {
    const sortParams = sortColumnToApiParams(sortColumn.value, sortDirection.value)
    const res = await listTickets(projectId.value, {
      offset: first.value,
      limit: rows.value,
      ...sortParams,
      ...(appliedSearch.value.trim() ? { search: appliedSearch.value.trim() } : {}),
      ...(filterTicketType.value ? { ticket_type: filterTicketType.value } : {}),
      ...(filterPriority.value ? { priority: filterPriority.value } : {}),
      ...(includeSubtasks.value ? {} : { has_parent: false }),
    })
    tickets.value = includeSubtasks.value
      ? res.items
      : res.items.filter(isTopLevelTicket)
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
  void loadTickets()
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
  includeSubtasks.value = false
  first.value = 0
  loadTickets()
}

function openCreateDialog() {
  createAttempted.value = false
  resetCreateForm()
  createVisible.value = true
}

function openAiGenerateDialog() {
  aiPrompt.value = ''
  aiGenerateError.value = null
  aiDialogOpen.value = true
}

async function runAiGenerate() {
  const prompt = aiPrompt.value.trim()
  if (!prompt) return
  try {
    const result = await runContentGenerate({
      context: 'ticket_create',
      prompt,
      project_id: projectId.value,
    })
    if (result.title) createForm.value.title = result.title
    if (result.description) createForm.value.description = result.description
    if (result.ticket_type) createForm.value.ticket_type = result.ticket_type
    if (result.priority) createForm.value.priority = result.priority
    if (result.story_points != null) createForm.value.story_points = result.story_points
    aiDialogOpen.value = false
    toast.showSuccess(t('common.success'), t('contentAssist.reviewBeforeSave'))
  } catch {
    // error shown in dialog
  }
}

function resetCreateForm() {
  createForm.value = {
    title: '',
    description: '',
    ticket_type: 'task',
    priority: 'medium',
    assignee_id: null,
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
      description: sanitizeMarkdownInput(createForm.value.description).trim() || null,
      ticket_type: createForm.value.ticket_type,
      priority: createForm.value.priority,
      assignee_id: createForm.value.assignee_id,
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

async function submitExport(payload: {
  ticketIds?: string[]
  workflowStatusIds?: string[]
}) {
  exporting.value = true
  try {
    await exportTickets(projectId.value, {
      ticketIds: payload.ticketIds,
      workflowStatusIds: payload.workflowStatusIds,
    })
    exportDialogVisible.value = false
  } catch {
    toast.showError(t('common.error'), t('tickets.exportFailed'))
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
    }
  },
)

watch([filterTicketType, filterPriority, includeSubtasks], () => {
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
