<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  getStoryWorkflow,
  createStoryWorkflowStatus,
  updateStoryWorkflowStatus,
  deleteStoryWorkflowStatus,
  type StoryWorkflow,
  type StoryWorkflowStatus,
} from '@/api/kb'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Select from 'primevue/select'
import Tag from 'primevue/tag'
import Dialog from 'primevue/dialog'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import ProgressSpinner from 'primevue/progressspinner'
import { useToast } from 'primevue/usetoast'

const route = useRoute()
const { t } = useI18n()
const toast = useToast()

const projectId = computed(() => route.params.projectId as string)

const workflow = ref<StoryWorkflow | null>(null)
const loading = ref(true)

const showAddDialog = ref(false)
const newStatus = ref({ name: '', category: 'draft', color: '#6B7280', position: 0, is_initial: false, is_terminal: false })
const saving = ref(false)

const editingStatusId = ref<string | null>(null)
const editDraft = ref<Partial<StoryWorkflowStatus>>({})

const categoryOptions = [
  { label: 'Draft', value: 'draft' },
  { label: 'Review', value: 'review' },
  { label: 'Ready', value: 'ready' },
  { label: 'Ticketed', value: 'ticketed' },
]

async function load() {
  loading.value = true
  try {
    workflow.value = await getStoryWorkflow(projectId.value)
  } finally {
    loading.value = false
  }
}

onMounted(load)

async function addStatus() {
  if (!newStatus.value.name.trim()) return
  saving.value = true
  try {
    await createStoryWorkflowStatus(projectId.value, {
      name: newStatus.value.name.trim(),
      category: newStatus.value.category,
      color: newStatus.value.color,
      position: newStatus.value.position,
      is_initial: newStatus.value.is_initial,
      is_terminal: newStatus.value.is_terminal,
    })
    showAddDialog.value = false
    newStatus.value = { name: '', category: 'draft', color: '#6B7280', position: 0, is_initial: false, is_terminal: false }
    await load()
  } finally {
    saving.value = false
  }
}

function startEdit(s: StoryWorkflowStatus) {
  editingStatusId.value = s.id
  editDraft.value = { name: s.name, category: s.category, color: s.color, position: s.position, is_initial: s.is_initial, is_terminal: s.is_terminal }
}

async function commitEdit(s: StoryWorkflowStatus) {
  const changes: Record<string, unknown> = {}
  if (editDraft.value.name && editDraft.value.name !== s.name) changes.name = editDraft.value.name
  if (editDraft.value.category && editDraft.value.category !== s.category) changes.category = editDraft.value.category
  if (editDraft.value.color && editDraft.value.color !== s.color) changes.color = editDraft.value.color
  if (editDraft.value.position !== undefined && editDraft.value.position !== s.position) changes.position = editDraft.value.position
  if (editDraft.value.is_initial !== undefined && editDraft.value.is_initial !== s.is_initial) changes.is_initial = editDraft.value.is_initial
  if (editDraft.value.is_terminal !== undefined && editDraft.value.is_terminal !== s.is_terminal) changes.is_terminal = editDraft.value.is_terminal

  if (Object.keys(changes).length) {
    await updateStoryWorkflowStatus(projectId.value, s.id, changes as Partial<StoryWorkflowStatus>)
    await load()
  }
  editingStatusId.value = null
}

function cancelEdit() {
  editingStatusId.value = null
}

async function removeStatus(s: StoryWorkflowStatus) {
  if (!confirm(`Delete status "${s.name}"? This cannot be undone.`)) return
  try {
    await deleteStoryWorkflowStatus(projectId.value, s.id)
    await load()
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : t('kb.cannotDeleteInUse')
    toast.add({ severity: 'error', summary: 'Error', detail: msg, life: 4000 })
  }
}

function severityForCategory(cat: string) {
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
  <div class="p-4" style="max-width: 900px;">
    <div class="flex align-items-center justify-content-between mb-4">
      <h2 class="m-0">{{ t('kb.storyWorkflow') }}</h2>
      <Button
        :label="t('kb.addStatus')"
        icon="pi pi-plus"
        size="small"
        @click="showAddDialog = true"
      />
    </div>

    <div v-if="loading" class="flex justify-content-center py-6">
      <ProgressSpinner />
    </div>

    <DataTable v-else-if="workflow" :value="workflow.statuses" size="small" class="text-sm">
      <Column :header="t('kb.statusName')" style="min-width: 10rem">
        <template #body="{ data }">
          <template v-if="editingStatusId === data.id">
            <InputText v-model="editDraft.name" size="small" class="w-full" />
          </template>
          <template v-else>
            <span class="font-semibold cursor-pointer" @click="startEdit(data)">{{ data.name }}</span>
          </template>
        </template>
      </Column>
      <Column :header="t('kb.statusCategory')" style="width: 8rem">
        <template #body="{ data }">
          <template v-if="editingStatusId === data.id">
            <Select
              v-model="editDraft.category"
              :options="categoryOptions"
              option-label="label"
              option-value="value"
              class="w-full"
              size="small"
            />
          </template>
          <template v-else>
            <Tag :value="data.category" :severity="severityForCategory(data.category)" />
          </template>
        </template>
      </Column>
      <Column :header="t('kb.statusColor')" style="width: 6rem">
        <template #body="{ data }">
          <template v-if="editingStatusId === data.id">
            <input type="color" v-model="editDraft.color" class="w-full" style="height: 2rem;" />
          </template>
          <template v-else>
            <div
              class="border-round"
              :style="{ background: data.color, width: '2rem', height: '1.25rem' }"
            />
          </template>
        </template>
      </Column>
      <Column :header="t('kb.statusPosition')" style="width: 5rem">
        <template #body="{ data }">
          <template v-if="editingStatusId === data.id">
            <InputNumber v-model="editDraft.position" size="small" class="w-full" :min="0" />
          </template>
          <template v-else>
            {{ data.position }}
          </template>
        </template>
      </Column>
      <Column :header="t('kb.isInitial')" style="width: 5rem">
        <template #body="{ data }">
          <template v-if="editingStatusId === data.id">
            <input type="checkbox" v-model="editDraft.is_initial" />
          </template>
          <template v-else>
            <i v-if="data.is_initial" class="pi pi-check text-green-500" />
          </template>
        </template>
      </Column>
      <Column :header="t('kb.isTerminal')" style="width: 5rem">
        <template #body="{ data }">
          <template v-if="editingStatusId === data.id">
            <input type="checkbox" v-model="editDraft.is_terminal" />
          </template>
          <template v-else>
            <i v-if="data.is_terminal" class="pi pi-check text-green-500" />
          </template>
        </template>
      </Column>
      <Column style="width: 7rem">
        <template #body="{ data }">
          <template v-if="editingStatusId === data.id">
            <div class="flex gap-1">
              <Button icon="pi pi-check" size="small" text severity="success" @click="commitEdit(data)" />
              <Button icon="pi pi-times" size="small" text severity="secondary" @click="cancelEdit" />
            </div>
          </template>
          <template v-else>
            <div class="flex gap-1">
              <Button icon="pi pi-pencil" size="small" text severity="secondary" @click="startEdit(data)" />
              <Button icon="pi pi-trash" size="small" text severity="danger" @click="removeStatus(data)" />
            </div>
          </template>
        </template>
      </Column>
    </DataTable>

    <!-- Add status dialog -->
    <Dialog
      v-model:visible="showAddDialog"
      :header="t('kb.addStatus')"
      modal
      :style="{ width: '28rem', maxWidth: '95vw' }"
    >
      <div class="flex flex-column gap-3">
        <div>
          <label class="block text-sm font-semibold mb-1">{{ t('kb.statusName') }}</label>
          <InputText v-model="newStatus.name" class="w-full" autofocus />
        </div>
        <div>
          <label class="block text-sm font-semibold mb-1">{{ t('kb.statusCategory') }}</label>
          <Select
            v-model="newStatus.category"
            :options="categoryOptions"
            option-label="label"
            option-value="value"
            class="w-full"
          />
        </div>
        <div>
          <label class="block text-sm font-semibold mb-1">{{ t('kb.statusColor') }}</label>
          <input type="color" v-model="newStatus.color" class="w-full" style="height: 2.5rem;" />
        </div>
        <div>
          <label class="block text-sm font-semibold mb-1">{{ t('kb.statusPosition') }}</label>
          <InputNumber v-model="newStatus.position" class="w-full" :min="0" />
        </div>
        <div class="flex gap-4">
          <label class="flex align-items-center gap-2">
            <input type="checkbox" v-model="newStatus.is_initial" />
            {{ t('kb.isInitial') }}
          </label>
          <label class="flex align-items-center gap-2">
            <input type="checkbox" v-model="newStatus.is_terminal" />
            {{ t('kb.isTerminal') }}
          </label>
        </div>
      </div>
      <template #footer>
        <Button :label="t('common.cancel')" severity="secondary" text @click="showAddDialog = false" />
        <Button
          :label="t('common.create')"
          icon="pi pi-check"
          :loading="saving"
          :disabled="!newStatus.name.trim()"
          @click="addStatus"
        />
      </template>
    </Dialog>
  </div>
</template>
