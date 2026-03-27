<template>
  <div class="workflow-editor">
    <div class="flex justify-content-between align-items-center mb-4">
      <h3>{{ workflow?.name || 'Workflow Editor' }}</h3>
      <div class="flex gap-2">
        <Button label="Add Status" icon="pi pi-plus" size="small" @click="showAddStatus = true" />
        <Button
          :label="addingTransition ? 'Cancel' : 'Add Transition'"
          :icon="addingTransition ? 'pi pi-times' : 'pi pi-arrow-right'"
          :severity="addingTransition ? 'danger' : 'secondary'"
          size="small"
          @click="toggleTransitionMode"
        />
        <Button label="Validate" icon="pi pi-check-circle" severity="info" size="small" @click="handleValidate" />
      </div>
    </div>

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

    <div class="status-row flex gap-3 flex-wrap mb-4">
      <div
        v-for="status in sortedStatuses"
        :key="status.id"
        class="status-card p-3 border-round shadow-1 cursor-pointer"
        :style="{ borderLeft: `4px solid ${status.color}`, minWidth: '160px' }"
        @click="handleStatusClick(status)"
      >
        <div class="flex justify-content-between align-items-start">
          <div>
            <div class="font-semibold mb-1">{{ status.name }}</div>
            <Tag
              :value="status.category"
              :severity="categoryColor(status.category)"
              class="text-xs"
            />
          </div>
          <Button icon="pi pi-trash" text severity="danger" size="small" @click.stop="handleRemoveStatus(status.id)" />
        </div>
        <div class="flex gap-1 mt-2">
          <Tag v-if="status.is_initial" value="Initial" severity="info" class="text-xs" />
          <Tag v-if="status.is_terminal" value="Terminal" severity="success" class="text-xs" />
        </div>
      </div>
    </div>

    <h4>Transitions</h4>
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

    <!-- Add Status Dialog -->
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
        <div class="flex gap-3">
          <div class="flex align-items-center gap-2">
            <Checkbox v-model="newStatus.is_initial" :binary="true" inputId="initial" />
            <label for="initial">Initial</label>
          </div>
          <div class="flex align-items-center gap-2">
            <Checkbox v-model="newStatus.is_terminal" :binary="true" inputId="terminal" />
            <label for="terminal">Terminal</label>
          </div>
        </div>
      </div>
      <template #footer>
        <Button label="Cancel" text @click="showAddStatus = false" />
        <Button label="Add" icon="pi pi-check" @click="handleAddStatus" />
      </template>
    </Dialog>

    <!-- Edit Status Dialog -->
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
        <div class="flex gap-3">
          <div class="flex align-items-center gap-2">
            <Checkbox v-model="editingStatus.is_initial" :binary="true" inputId="editInitial" />
            <label for="editInitial">Initial</label>
          </div>
          <div class="flex align-items-center gap-2">
            <Checkbox v-model="editingStatus.is_terminal" :binary="true" inputId="editTerminal" />
            <label for="editTerminal">Terminal</label>
          </div>
        </div>
      </div>
      <template #footer>
        <Button label="Cancel" text @click="showEditStatus = false" />
        <Button label="Save" icon="pi pi-check" @click="handleUpdateStatus" />
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import Checkbox from 'primevue/checkbox'
import Message from 'primevue/message'
import {
  getWorkflow,
  addStatus,
  updateStatus,
  removeStatus,
  addTransition,
  removeTransition,
  validateWorkflow,
  type Workflow,
  type WorkflowStatus,
} from '@/api/workflows'

const props = defineProps<{ workflowId: string }>()
const workflow = ref<Workflow | null>(null)

const showAddStatus = ref(false)
const showEditStatus = ref(false)
const addingTransition = ref(false)
const transitionSource = ref<WorkflowStatus | null>(null)
const validationErrors = ref<string[]>([])
const validationSuccess = ref(false)
const editingStatus = ref<{ id: string; name: string; category: string; color: string; is_initial: boolean; is_terminal: boolean } | null>(null)
const newStatus = ref({ name: '', category: 'to_do', color: '#6B7280', is_initial: false, is_terminal: false })

const sortedStatuses = computed(() =>
  [...(workflow.value?.statuses || [])].sort((a, b) => a.position - b.position)
)

function statusName(id: string) {
  return workflow.value?.statuses.find(s => s.id === id)?.name ?? '???'
}

function categoryColor(cat: string) {
  if (cat === 'to_do') return 'info'
  if (cat === 'in_progress') return 'warn'
  return 'success'
}

async function reload() {
  workflow.value = await getWorkflow(props.workflowId)
}

onMounted(reload)

function toggleTransitionMode() {
  addingTransition.value = !addingTransition.value
  transitionSource.value = null
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
  }
  showEditStatus.value = true
}

async function handleAddStatus() {
  const pos = (workflow.value?.statuses.length ?? 0)
  await addStatus(props.workflowId, { ...newStatus.value, position: pos })
  showAddStatus.value = false
  newStatus.value = { name: '', category: 'to_do', color: '#6B7280', is_initial: false, is_terminal: false }
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
</style>
