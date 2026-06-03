<template>
  <div class="workflow-editor">
    <div class="flex justify-content-between align-items-center mb-4">
      <h3>{{ workflow?.name || 'Workflow Editor' }}</h3>
      <div class="flex gap-2">
        <Button label="Add Status" icon="pi pi-plus" size="small" @click="showAddStatus = true" />
        <Button
          :label="addingTransition ? $t('common.cancel') : 'Add Transition'"
          :icon="addingTransition ? 'pi pi-times' : 'pi pi-arrow-right'"
          :severity="addingTransition ? 'danger' : 'secondary'"
          size="small"
          @click="toggleTransitionMode"
        />
        <Button label="Validate" icon="pi pi-check-circle" severity="info" size="small" @click="handleValidate" />
      </div>
    </div>

    <Message severity="info" class="mb-3" :closable="false">
      {{ $t('workflows.statusOrderHelp') }}
    </Message>

    <Message v-if="validationErrors.length" severity="warn" class="mb-3">
      <ul class="m-0 pl-3">
        <li v-for="err in validationErrors" :key="err">{{ err }}</li>
      </ul>
    </Message>

    <Message v-if="validationSuccess" severity="success" class="mb-3">Workflow is valid!</Message>

    <div v-if="addingTransition" class="mb-3">
      <Tag severity="info">
        {{ transitionSource ? `Click target status (from: ${transitionSource.name})` : 'Click source status' }}
      </Tag>
    </div>

    <p class="text-xs text-color-secondary mb-2">{{ $t('workflows.dragToReorder') }}</p>
    <draggable
      v-model="orderedStatuses"
      item-key="id"
      class="status-order-row flex gap-3 overflow-x-auto pb-2"
      handle=".status-drag-handle"
      :disabled="addingTransition || reordering"
      @end="onStatusReorder"
    >
      <template #item="{ element: status }">
        <div
          class="status-card p-3 border-round shadow-1"
          :class="{ 'cursor-pointer': !addingTransition, 'status-card--transition': addingTransition }"
          :style="{ borderLeft: `4px solid ${status.color}`, minWidth: '180px', flexShrink: 0 }"
          @click="handleStatusClick(status)"
        >
          <div class="flex justify-content-between align-items-start gap-2">
            <div class="flex align-items-start gap-2 flex-1 min-w-0">
              <i
                class="pi pi-bars status-drag-handle text-color-secondary mt-1"
                :title="$t('workflows.dragToReorder')"
                @click.stop
              />
              <div class="min-w-0">
                <div class="font-semibold mb-1">{{ status.name }}</div>
                <Tag
                  :value="status.category"
                  :severity="categoryColor(status.category)"
                  class="text-xs"
                />
              </div>
            </div>
            <Button icon="pi pi-trash" text severity="danger" size="small" @click.stop="handleRemoveStatus(status.id)" />
          </div>
          <div class="flex gap-1 mt-2 flex-wrap">
            <Tag v-if="status.is_initial" value="Initial" severity="info" class="text-xs" />
            <Tag v-if="status.is_terminal" value="Terminal" severity="success" class="text-xs" />
            <Tag
              :value="status.show_on_board ? $t('workflows.onBoard') : $t('workflows.hiddenFromBoard')"
              :severity="status.show_on_board ? 'secondary' : 'warn'"
              class="text-xs"
            />
          </div>
        </div>
      </template>
    </draggable>

    <h4 class="mt-4">Transitions</h4>
    <DataTable :value="workflow?.transitions || []" stripedRows class="p-datatable-sm">
      <Column header="From">
        <template #body="{ data }">
          {{ statusName(data.from_status_id) }}
        </template>
      </Column>
      <Column header="To">
        <template #body="{ data }">
          {{ statusName(data.to_status_id) }}
        </template>
      </Column>
      <Column field="name" header="Name" />
      <Column header="">
        <template #body="{ data }">
          <Button icon="pi pi-trash" text severity="danger" size="small" @click="handleRemoveTransition(data.id)" />
        </template>
      </Column>
    </DataTable>

    <Dialog v-model:visible="showAddStatus" header="Add Status" modal :style="{ width: '400px' }">
      <div class="flex flex-column gap-3 pt-2">
        <div class="flex flex-column gap-1">
          <label>Name</label>
          <InputText v-model="newStatus.name" />
        </div>
        <div class="flex flex-column gap-1">
          <label>Category</label>
          <Select v-model="newStatus.category" :options="['to_do', 'in_progress', 'done']" />
        </div>
        <div class="flex flex-column gap-1">
          <label>Color</label>
          <InputText v-model="newStatus.color" placeholder="#6B7280" />
        </div>
        <div class="flex gap-3 flex-wrap">
          <div class="flex align-items-center gap-2">
            <Checkbox v-model="newStatus.is_initial" :binary="true" inputId="initial" />
            <label for="initial">Initial</label>
          </div>
          <div class="flex align-items-center gap-2">
            <Checkbox v-model="newStatus.is_terminal" :binary="true" inputId="terminal" />
            <label for="terminal">Terminal</label>
          </div>
          <div class="flex align-items-center gap-2">
            <Checkbox v-model="newStatus.show_on_board" :binary="true" inputId="addShowOnBoard" />
            <label for="addShowOnBoard">{{ $t('workflows.showOnBoard') }}</label>
          </div>
        </div>
        <p class="text-xs text-color-secondary m-0">{{ $t('workflows.showOnBoardHint') }}</p>
      </div>
      <template #footer>
        <Button label="Cancel" text @click="showAddStatus = false" />
        <Button label="Add" icon="pi pi-check" @click="handleAddStatus" />
      </template>
    </Dialog>

    <Dialog v-model:visible="showEditStatus" header="Edit Status" modal :style="{ width: '400px' }">
      <div v-if="editingStatus" class="flex flex-column gap-3 pt-2">
        <div class="flex flex-column gap-1">
          <label>Name</label>
          <InputText v-model="editingStatus.name" />
        </div>
        <div class="flex flex-column gap-1">
          <label>Category</label>
          <Select v-model="editingStatus.category" :options="['to_do', 'in_progress', 'done']" />
        </div>
        <div class="flex flex-column gap-1">
          <label>Color</label>
          <InputText v-model="editingStatus.color" />
        </div>
        <div class="flex gap-3 flex-wrap">
          <div class="flex align-items-center gap-2">
            <Checkbox v-model="editingStatus.is_initial" :binary="true" inputId="editInitial" />
            <label for="editInitial">Initial</label>
          </div>
          <div class="flex align-items-center gap-2">
            <Checkbox v-model="editingStatus.is_terminal" :binary="true" inputId="editTerminal" />
            <label for="editTerminal">Terminal</label>
          </div>
          <div class="flex align-items-center gap-2">
            <Checkbox v-model="editingStatus.show_on_board" :binary="true" inputId="editShowOnBoard" />
            <label for="editShowOnBoard">{{ $t('workflows.showOnBoard') }}</label>
          </div>
        </div>
        <p class="text-xs text-color-secondary m-0">{{ $t('workflows.showOnBoardHint') }}</p>
      </div>
      <template #footer>
        <Button label="Cancel" text @click="showEditStatus = false" />
        <Button label="Save" icon="pi pi-check" @click="handleUpdateStatus" />
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import draggable from 'vuedraggable'
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import Checkbox from 'primevue/checkbox'
import Message from 'primevue/message'
import { useToastService } from '@/composables/useToast'
import {
  getWorkflow,
  addStatus,
  updateStatus,
  removeStatus,
  addTransition,
  removeTransition,
  validateWorkflow,
  reorderWorkflowStatuses,
  type Workflow,
  type WorkflowStatus,
} from '@/api/workflows'

const props = defineProps<{ workflowId: string }>()
const { t } = useI18n()
const toast = useToastService()

const workflow = ref<Workflow | null>(null)
const orderedStatuses = ref<WorkflowStatus[]>([])
const reordering = ref(false)

const showAddStatus = ref(false)
const showEditStatus = ref(false)
const addingTransition = ref(false)
const transitionSource = ref<WorkflowStatus | null>(null)
const validationErrors = ref<string[]>([])
const validationSuccess = ref(false)
const editingStatus = ref<{
  id: string
  name: string
  category: string
  color: string
  is_initial: boolean
  is_terminal: boolean
  show_on_board: boolean
} | null>(null)
const newStatus = ref({
  name: '',
  category: 'to_do',
  color: '#6B7280',
  is_initial: false,
  is_terminal: false,
  show_on_board: true,
})

function syncOrderedStatuses() {
  orderedStatuses.value = [...(workflow.value?.statuses || [])].sort(
    (a, b) => a.position - b.position,
  )
}

function statusName(id: string) {
  return workflow.value?.statuses.find(s => s.id === id)?.name ?? '???'
}

function categoryColor(cat: string) {
  if (cat === 'to_do') return 'info'
  if (cat === 'in_progress') return 'warn'
  return 'success'
}

function defaultPositionForNewStatus(): number {
  const statuses = workflow.value?.statuses ?? []
  const terminals = statuses.filter(s => s.is_terminal).sort((a, b) => a.position - b.position)
  if (terminals.length > 0) {
    return terminals[0]!.position
  }
  return statuses.length
}

async function reload() {
  workflow.value = await getWorkflow(props.workflowId)
  syncOrderedStatuses()
}

onMounted(reload)

function toggleTransitionMode() {
  addingTransition.value = !addingTransition.value
  transitionSource.value = null
}

async function onStatusReorder() {
  if (!workflow.value) return
  reordering.value = true
  try {
    await reorderWorkflowStatuses(
      props.workflowId,
      orderedStatuses.value.map(s => s.id),
    )
    await reload()
  } catch {
    toast.showError(t('common.error'), t('workflows.reorderFailed'))
    syncOrderedStatuses()
  } finally {
    reordering.value = false
  }
}

async function handleStatusClick(status: WorkflowStatus) {
  if (addingTransition.value) {
    if (!transitionSource.value) {
      transitionSource.value = status
    } else {
      await addTransition(props.workflowId, {
        from_status_id: transitionSource.value.id,
        to_status_id: status.id,
      })
      addingTransition.value = false
      transitionSource.value = null
      await reload()
    }
    return
  }
  editingStatus.value = {
    id: status.id,
    name: status.name,
    category: status.category,
    color: status.color,
    is_initial: status.is_initial,
    is_terminal: status.is_terminal,
    show_on_board: status.show_on_board,
  }
  showEditStatus.value = true
}

async function handleAddStatus() {
  const pos = defaultPositionForNewStatus()
  await addStatus(props.workflowId, { ...newStatus.value, position: pos })
  showAddStatus.value = false
  newStatus.value = {
    name: '',
    category: 'to_do',
    color: '#6B7280',
    is_initial: false,
    is_terminal: false,
    show_on_board: true,
  }
  await reload()
}

async function handleUpdateStatus() {
  if (!editingStatus.value) return
  await updateStatus(editingStatus.value.id, {
    name: editingStatus.value.name,
    category: editingStatus.value.category,
    color: editingStatus.value.color,
    is_initial: editingStatus.value.is_initial,
    is_terminal: editingStatus.value.is_terminal,
    show_on_board: editingStatus.value.show_on_board,
  })
  showEditStatus.value = false
  editingStatus.value = null
  await reload()
}

async function handleRemoveStatus(statusId: string) {
  await removeStatus(statusId)
  await reload()
}

async function handleRemoveTransition(transitionId: string) {
  await removeTransition(transitionId)
  await reload()
}

async function handleValidate() {
  const result = await validateWorkflow(props.workflowId)
  validationErrors.value = result.errors
  validationSuccess.value = result.valid
}
</script>

<style scoped>
.status-card {
  background: var(--surface-card);
  transition: box-shadow 0.2s;
}
.status-card:hover {
  box-shadow: 0 4px 14px var(--shadow-color);
}
.status-card--transition {
  cursor: pointer;
}
.status-drag-handle {
  cursor: grab;
}
.status-drag-handle:active {
  cursor: grabbing;
}
.status-order-row {
  min-height: 6rem;
}
</style>
