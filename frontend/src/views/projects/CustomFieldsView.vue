<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import Textarea from 'primevue/textarea'
import Checkbox from 'primevue/checkbox'
import Tag from 'primevue/tag'
import { useToastService } from '@/composables/useToast'
import {
  listFieldDefinitions,
  createFieldDefinition,
  updateFieldDefinition,
  deleteFieldDefinition,
  addFieldOption,
  removeFieldOption,
  type CustomFieldDefinition,
  type CustomFieldDefinitionCreate,
} from '@/api/custom-fields'

const route = useRoute()
const { t } = useI18n()
const toast = useToastService()
const projectId = route.params.projectId as string

const fields = ref<CustomFieldDefinition[]>([])
const loading = ref(false)

const showCreateDialog = ref(false)
const showEditDialog = ref(false)
const saving = ref(false)

const fieldTypeOptions = [
  { label: t('customFields.types.text'), value: 'text' },
  { label: t('customFields.types.number'), value: 'number' },
  { label: t('customFields.types.date'), value: 'date' },
  { label: t('customFields.types.select'), value: 'select' },
  { label: t('customFields.types.multiSelect'), value: 'multi_select' },
  { label: t('customFields.types.user'), value: 'user' },
  { label: t('customFields.types.url'), value: 'url' },
  { label: t('customFields.types.checkbox'), value: 'checkbox' },
]

const newField = ref<CustomFieldDefinitionCreate>({
  name: '',
  field_type: 'text',
  description: '',
  is_required: false,
  options: [],
})

const editingField = ref<CustomFieldDefinition | null>(null)
const editName = ref('')
const editDescription = ref('')
const editRequired = ref(false)

const newOptionLabel = ref('')
const newOptionColor = ref('#6366f1')

const showsOptions = computed(() => ['select', 'multi_select'].includes(newField.value.field_type))

async function loadFields() {
  loading.value = true
  try {
    fields.value = await listFieldDefinitions(projectId)
  } finally {
    loading.value = false
  }
}

function openCreateDialog() {
  newField.value = { name: '', field_type: 'text', description: '', is_required: false, options: [] }
  newOptionLabel.value = ''
  newOptionColor.value = '#6366f1'
  showCreateDialog.value = true
}

function addNewOption() {
  if (!newOptionLabel.value.trim()) return
  newField.value.options = [
    ...(newField.value.options ?? []),
    { label: newOptionLabel.value.trim(), color: newOptionColor.value },
  ]
  newOptionLabel.value = ''
  newOptionColor.value = '#6366f1'
}

function removeNewOption(index: number) {
  newField.value.options = (newField.value.options ?? []).filter((_, i) => i !== index)
}

async function onCreate() {
  if (!newField.value.name.trim()) return
  saving.value = true
  try {
    await createFieldDefinition(projectId, newField.value)
    showCreateDialog.value = false
    toast.showSuccess(t('common.success'), t('customFields.created'))
    await loadFields()
  } finally {
    saving.value = false
  }
}

function openEditDialog(field: CustomFieldDefinition) {
  editingField.value = field
  editName.value = field.name
  editDescription.value = field.description ?? ''
  editRequired.value = field.is_required
  showEditDialog.value = true
}

async function onUpdate() {
  if (!editingField.value) return
  saving.value = true
  try {
    await updateFieldDefinition(editingField.value.id, {
      name: editName.value,
      description: editDescription.value || undefined,
      is_required: editRequired.value,
    })
    showEditDialog.value = false
    toast.showSuccess(t('common.success'), t('customFields.updated'))
    await loadFields()
  } finally {
    saving.value = false
  }
}

async function onDelete(field: CustomFieldDefinition) {
  try {
    await deleteFieldDefinition(field.id)
    toast.showSuccess(t('common.success'), t('customFields.deleted'))
    await loadFields()
  } catch {
    // handled by global interceptor
  }
}

const editOptionLabel = ref('')
const editOptionColor = ref('#6366f1')

async function onAddOption() {
  if (!editingField.value || !editOptionLabel.value.trim()) return
  try {
    await addFieldOption(editingField.value.id, {
      label: editOptionLabel.value.trim(),
      color: editOptionColor.value,
    })
    editOptionLabel.value = ''
    editOptionColor.value = '#6366f1'
    await loadFields()
    editingField.value = fields.value.find((f) => f.id === editingField.value!.id) ?? null
  } catch {
    // handled by global interceptor
  }
}

async function onRemoveOption(optionId: string) {
  try {
    await removeFieldOption(optionId)
    await loadFields()
    if (editingField.value) {
      editingField.value = fields.value.find((f) => f.id === editingField.value!.id) ?? null
    }
  } catch {
    // handled by global interceptor
  }
}

function fieldTypeLabel(type: string) {
  const found = fieldTypeOptions.find((o) => o.value === type)
  return found?.label ?? type
}

onMounted(loadFields)
</script>

<template>
  <div>
    <div class="flex align-items-center justify-content-between mb-4">
      <h2 class="m-0">{{ $t('customFields.title') }}</h2>
      <Button :label="$t('customFields.create')" icon="pi pi-plus" @click="openCreateDialog" />
    </div>

    <DataTable :value="fields" :loading="loading" stripedRows responsiveLayout="scroll">
      <template #empty>
        <div class="text-center text-color-secondary p-4">{{ $t('customFields.empty') }}</div>
      </template>
      <Column :header="$t('customFields.fieldName')" field="name" />
      <Column :header="$t('customFields.fieldType')">
        <template #body="{ data }">
          <Tag :value="fieldTypeLabel(data.field_type)" severity="info" />
        </template>
      </Column>
      <Column :header="$t('customFields.required')">
        <template #body="{ data }">
          <i v-if="data.is_required" class="pi pi-check text-green-500" />
          <i v-else class="pi pi-minus text-color-secondary" />
        </template>
      </Column>
      <Column :header="$t('customFields.options')">
        <template #body="{ data }">
          <div v-if="data.options?.length" class="flex gap-1 flex-wrap">
            <Tag v-for="opt in data.options" :key="opt.id" :value="opt.label"
              :style="opt.color ? { background: opt.color, color: '#fff', borderColor: opt.color } : {}"
              rounded />
          </div>
          <span v-else class="text-color-secondary">—</span>
        </template>
      </Column>
      <Column :header="$t('common.actions')" style="width: 10rem">
        <template #body="{ data }">
          <div class="flex gap-2">
            <Button icon="pi pi-pencil" severity="secondary" text rounded @click="openEditDialog(data)" />
            <Button icon="pi pi-trash" severity="danger" text rounded @click="onDelete(data)" />
          </div>
        </template>
      </Column>
    </DataTable>

    <!-- Create dialog -->
    <Dialog v-model:visible="showCreateDialog" :header="$t('customFields.create')" modal :style="{ width: '32rem', maxWidth: '95vw' }">
      <div class="flex flex-column gap-3">
        <div>
          <label class="block text-sm font-semibold mb-1">{{ $t('customFields.fieldName') }}</label>
          <InputText v-model="newField.name" class="w-full" :placeholder="$t('customFields.fieldNamePlaceholder')" />
        </div>
        <div>
          <label class="block text-sm font-semibold mb-1">{{ $t('customFields.fieldType') }}</label>
          <Select v-model="newField.field_type" :options="fieldTypeOptions" optionLabel="label" optionValue="value" class="w-full" />
        </div>
        <div>
          <label class="block text-sm font-semibold mb-1">{{ $t('customFields.description') }}</label>
          <Textarea v-model="newField.description" class="w-full" rows="2" />
        </div>
        <div class="flex align-items-center gap-2">
          <Checkbox v-model="newField.is_required" :binary="true" inputId="new-required" />
          <label for="new-required" class="text-sm">{{ $t('customFields.required') }}</label>
        </div>

        <div v-if="showsOptions" class="flex flex-column gap-2">
          <label class="block text-sm font-semibold">{{ $t('customFields.options') }}</label>
          <div v-for="(opt, i) in (newField.options ?? [])" :key="i" class="flex align-items-center gap-2">
            <Tag :value="opt.label" :style="opt.color ? { background: opt.color, color: '#fff' } : {}" rounded />
            <Button icon="pi pi-times" severity="danger" text rounded size="small" @click="removeNewOption(i)" />
          </div>
          <div class="flex gap-2 align-items-end">
            <InputText v-model="newOptionLabel" :placeholder="$t('customFields.optionLabel')" class="flex-1" @keyup.enter="addNewOption" />
            <input type="color" v-model="newOptionColor" style="width: 2.5rem; height: 2.5rem; border: none; cursor: pointer" />
            <Button icon="pi pi-plus" severity="secondary" @click="addNewOption" />
          </div>
        </div>
      </div>
      <template #footer>
        <Button :label="$t('common.cancel')" severity="secondary" text @click="showCreateDialog = false" />
        <Button :label="$t('common.save')" icon="pi pi-check" :loading="saving" @click="onCreate" />
      </template>
    </Dialog>

    <!-- Edit dialog -->
    <Dialog v-model:visible="showEditDialog" :header="$t('customFields.edit')" modal :style="{ width: '32rem', maxWidth: '95vw' }">
      <div v-if="editingField" class="flex flex-column gap-3">
        <div>
          <label class="block text-sm font-semibold mb-1">{{ $t('customFields.fieldName') }}</label>
          <InputText v-model="editName" class="w-full" />
        </div>
        <div>
          <label class="block text-sm font-semibold mb-1">{{ $t('customFields.fieldType') }}</label>
          <Tag :value="fieldTypeLabel(editingField.field_type)" severity="info" />
          <span class="text-xs text-color-secondary ml-2">{{ $t('customFields.typeNotEditable') }}</span>
        </div>
        <div>
          <label class="block text-sm font-semibold mb-1">{{ $t('customFields.description') }}</label>
          <Textarea v-model="editDescription" class="w-full" rows="2" />
        </div>
        <div class="flex align-items-center gap-2">
          <Checkbox v-model="editRequired" :binary="true" inputId="edit-required" />
          <label for="edit-required" class="text-sm">{{ $t('customFields.required') }}</label>
        </div>

        <div v-if="['select', 'multi_select'].includes(editingField.field_type)" class="flex flex-column gap-2">
          <label class="block text-sm font-semibold">{{ $t('customFields.options') }}</label>
          <div v-for="opt in editingField.options" :key="opt.id" class="flex align-items-center gap-2">
            <Tag :value="opt.label" :style="opt.color ? { background: opt.color, color: '#fff' } : {}" rounded />
            <Button icon="pi pi-times" severity="danger" text rounded size="small" @click="onRemoveOption(opt.id)" />
          </div>
          <div class="flex gap-2 align-items-end">
            <InputText v-model="editOptionLabel" :placeholder="$t('customFields.optionLabel')" class="flex-1" @keyup.enter="onAddOption" />
            <input type="color" v-model="editOptionColor" style="width: 2.5rem; height: 2.5rem; border: none; cursor: pointer" />
            <Button icon="pi pi-plus" severity="secondary" @click="onAddOption" />
          </div>
        </div>
      </div>
      <template #footer>
        <Button :label="$t('common.cancel')" severity="secondary" text @click="showEditDialog = false" />
        <Button :label="$t('common.save')" icon="pi pi-check" :loading="saving" @click="onUpdate" />
      </template>
    </Dialog>
  </div>
</template>
