<template>
  <div class="import-tickets-view">
    <div v-if="loadingProject" class="flex justify-content-center align-items-center p-6">
      <ProgressSpinner style="width: 3rem; height: 3rem" strokeWidth="4" />
    </div>

    <template v-else-if="project">
      <div class="surface-card p-4 border-round shadow-1 mb-4">
        <div class="flex align-items-center gap-3">
          <Button icon="pi pi-arrow-left" text rounded @click="goBack" />
          <Tag :value="project.key" severity="info" class="text-lg font-semibold" />
          <h1 class="m-0 text-2xl font-semibold">{{ $t('import.title') }}</h1>
        </div>
      </div>

      <div class="surface-card p-4 border-round shadow-1">
        <div class="flex align-items-center justify-content-center gap-2 mb-5">
          <template v-for="(step, idx) in stepLabels" :key="idx">
            <div
              class="flex align-items-center gap-2 cursor-pointer"
              :class="{ 'opacity-50': idx > activeStep }"
              @click="idx < activeStep ? activeStep = idx : undefined"
            >
              <span
                class="flex align-items-center justify-content-center border-circle w-2rem h-2rem text-sm font-bold"
                :class="idx === activeStep ? 'bg-primary text-white' : idx < activeStep ? 'bg-green-500 text-white' : 'surface-200 text-color-secondary'"
              >
                <i v-if="idx < activeStep" class="pi pi-check text-xs"></i>
                <span v-else>{{ idx + 1 }}</span>
              </span>
              <span class="text-sm font-medium hidden md:inline" :class="idx === activeStep ? 'text-primary' : 'text-color-secondary'">
                {{ step }}
              </span>
            </div>
            <i v-if="idx < stepLabels.length - 1" class="pi pi-chevron-right text-color-secondary text-xs"></i>
          </template>
        </div>

        <!-- Step 0: Upload -->
        <div v-if="activeStep === 0">
          <h2 class="text-xl font-semibold mb-3">{{ $t('import.uploadTitle') }}</h2>
          <p class="text-color-secondary mb-4">{{ $t('import.uploadDescription') }}</p>

          <div class="mb-3">
            <label
              class="flex flex-column align-items-center justify-content-center border-2 border-dashed border-round p-6 cursor-pointer"
              :class="dragOver ? 'border-primary' : 'border-300'"
              style="min-height: 160px"
              @dragover.prevent="dragOver = true"
              @dragleave="dragOver = false"
              @drop.prevent="handleDrop"
            >
              <i class="pi pi-upload text-4xl text-color-secondary mb-3"></i>
              <span class="text-lg font-medium">{{ $t('import.dropFile') }}</span>
              <span class="text-color-secondary text-sm mt-1">{{ $t('import.orClickBrowse') }}</span>
              <input type="file" accept=".csv,.json,.txt" style="display: none" @change="handleFileSelect" />
            </label>
          </div>

          <div v-if="fileName" class="mb-3 flex align-items-center gap-2 p-3 surface-ground border-round">
            <i class="pi pi-file text-primary text-xl"></i>
            <span class="font-medium">{{ fileName }}</span>
            <span class="text-color-secondary text-sm">({{ fileSizeFormatted }})</span>
            <i class="pi pi-check-circle text-green-500 ml-auto"></i>
          </div>

          <div class="mt-4 pt-3 border-top-1 surface-border flex justify-content-end">
            <Button :label="hasContent ? 'Analyze & Continue' : 'Select a file first'" :icon="hasContent ? 'pi pi-arrow-right' : 'pi pi-info-circle'" :iconPos="hasContent ? 'right' : 'left'" :disabled="!hasContent" :loading="analyzing" @click="doAnalyze" />
          </div>
        </div>

        <!-- Step 1: Column Mapping -->
        <div v-if="activeStep === 1 && analysis">
          <h2 class="text-xl font-semibold mb-2">{{ $t('import.columnMappingTitle') }}</h2>
          <p class="text-color-secondary mb-4">
            {{ $t('import.columnMappingDescription', { total: analysis.total_rows }) }}
          </p>

          <DataTable :value="columnMappingRows" responsiveLayout="scroll" class="mb-4">
            <Column field="source" :header="$t('import.sourceColumn')" style="width: 40%">
              <template #body="{ data: row }">
                <span class="font-medium">{{ row.source }}</span>
              </template>
            </Column>
            <Column :header="$t('import.targetField')" style="width: 35%">
              <template #body="{ data: row }">
                <Select
                  v-model="row.target"
                  :options="targetFieldOptions"
                  optionLabel="label"
                  optionValue="value"
                  :placeholder="$t('import.skipColumn')"
                  class="w-full"
                  showClear
                />
              </template>
            </Column>
            <Column :header="$t('import.sampleValue')" style="width: 25%">
              <template #body="{ data: row }">
                <span class="text-color-secondary text-sm" style="max-width: 300px; display: inline-block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                  {{ row.sample }}
                </span>
              </template>
            </Column>
          </DataTable>

          <div class="flex justify-content-between">
            <Button :label="$t('common.back')" icon="pi pi-arrow-left" severity="secondary" outlined @click="activeStep = 0" />
            <Button :label="$t('import.next')" icon="pi pi-arrow-right" iconPos="right" @click="goToValueMapping" />
          </div>
        </div>

        <!-- Step 2: Value Mapping -->
        <div v-if="activeStep === 2 && analysis">
          <h2 class="text-xl font-semibold mb-2">{{ $t('import.valueMappingTitle') }}</h2>
          <p class="text-color-secondary mb-4">{{ $t('import.valueMappingDescription') }}</p>

          <div v-for="field in valueMappingFields" :key="field" class="mb-4">
            <h3 class="text-lg font-semibold mb-2">
              {{ fieldLabel(field) }} ({{ valueMappingData[field]?.length ?? 0 }} {{ $t('import.values') }})
            </h3>
            <DataTable :value="valueMappingData[field] || []" responsiveLayout="scroll">
              <Column field="source" :header="$t('import.sourceValue')" style="width: 40%">
                <template #body="{ data: row }">
                  <Tag :value="row.source" severity="secondary" />
                </template>
              </Column>
              <Column :header="$t('import.mappedTo')" style="width: 60%">
                <template #body="{ data: row }">
                  <Select
                    v-if="field === 'status'"
                    v-model="row.target"
                    :options="workflowStatusOptions"
                    optionLabel="label"
                    optionValue="value"
                    :placeholder="$t('import.useDefault')"
                    class="w-full"
                    showClear
                  />
                  <Select
                    v-else-if="field === 'ticket_type'"
                    v-model="row.target"
                    :options="ticketTypeOptions"
                    optionLabel="label"
                    optionValue="value"
                    :placeholder="$t('import.useDefault')"
                    class="w-full"
                    showClear
                  />
                  <Select
                    v-else-if="field === 'priority'"
                    v-model="row.target"
                    :options="priorityOptions"
                    optionLabel="label"
                    optionValue="value"
                    :placeholder="$t('import.useDefault')"
                    class="w-full"
                    showClear
                  />
                  <InputText v-else v-model="row.target" class="w-full" />
                </template>
              </Column>
            </DataTable>
          </div>

          <div class="flex justify-content-between mt-4">
            <Button :label="$t('common.back')" icon="pi pi-arrow-left" severity="secondary" outlined @click="activeStep = 1" />
            <Button :label="$t('import.next')" icon="pi pi-arrow-right" iconPos="right" @click="goToPreview" />
          </div>
        </div>

        <!-- Step 3: Preview -->
        <div v-if="activeStep === 3 && analysis">
          <h2 class="text-xl font-semibold mb-2">{{ $t('import.previewTitle') }}</h2>
          <p class="text-color-secondary mb-4">{{ $t('import.previewDescription', { total: analysis.total_rows }) }}</p>

          <DataTable :value="previewRows" responsiveLayout="scroll" class="mb-4" scrollable scrollHeight="400px">
            <Column v-for="col in previewColumns" :key="col" :field="col" :header="fieldLabel(col)" style="min-width: 150px">
              <template #body="{ data: row }">
                <span class="text-sm" style="max-width: 300px; display: inline-block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                  {{ formatPreviewValue(row[col]) }}
                </span>
              </template>
            </Column>
          </DataTable>

          <div class="surface-ground border-round p-3 mb-4">
            <h3 class="text-lg font-semibold mb-3">{{ $t('import.options') }}</h3>
            <div class="flex flex-column gap-3">
              <div class="flex align-items-center gap-2">
                <Checkbox v-model="importOptions.create_labels" :binary="true" inputId="opt-labels" />
                <label for="opt-labels">{{ $t('import.createLabels') }}</label>
              </div>
              <div class="flex align-items-center gap-2">
                <Checkbox v-model="importOptions.create_sprints" :binary="true" inputId="opt-sprints" />
                <label for="opt-sprints">{{ $t('import.createSprints') }}</label>
              </div>
              <div class="flex align-items-center gap-2">
                <Checkbox v-model="importOptions.skip_resolved" :binary="true" inputId="opt-resolved" />
                <label for="opt-resolved">{{ $t('import.skipResolved') }}</label>
              </div>
            </div>
          </div>

          <div class="flex justify-content-between">
            <Button :label="$t('common.back')" icon="pi pi-arrow-left" severity="secondary" outlined @click="activeStep = 2" />
            <Button
              :label="$t('import.executeImport', { count: analysis.total_rows })"
              icon="pi pi-check"
              severity="success"
              :loading="executing"
              @click="doExecute"
            />
          </div>
        </div>

        <!-- Step 4: Results -->
        <div v-if="activeStep === 4 && importResult">
          <h2 class="text-xl font-semibold mb-4">{{ $t('import.resultsTitle') }}</h2>

          <div class="grid mb-4">
            <div class="col-6 md:col-3">
              <div class="surface-ground border-round p-3 text-center">
                <div class="text-3xl font-bold text-primary">{{ importResult.tickets_created }}</div>
                <div class="text-color-secondary text-sm mt-1">{{ $t('import.ticketsCreated') }}</div>
              </div>
            </div>
            <div class="col-6 md:col-3">
              <div class="surface-ground border-round p-3 text-center">
                <div class="text-3xl font-bold">{{ importResult.tickets_skipped }}</div>
                <div class="text-color-secondary text-sm mt-1">{{ $t('import.ticketsSkipped') }}</div>
              </div>
            </div>
            <div class="col-6 md:col-3">
              <div class="surface-ground border-round p-3 text-center">
                <div class="text-3xl font-bold text-green-500">{{ importResult.parent_links_resolved }}</div>
                <div class="text-color-secondary text-sm mt-1">{{ $t('import.parentLinks') }}</div>
              </div>
            </div>
            <div class="col-6 md:col-3">
              <div class="surface-ground border-round p-3 text-center">
                <div class="text-3xl font-bold" :class="importResult.errors.length > 0 ? 'text-red-500' : 'text-green-500'">
                  {{ importResult.errors.length }}
                </div>
                <div class="text-color-secondary text-sm mt-1">{{ $t('import.errorCount') }}</div>
              </div>
            </div>
          </div>

          <div v-if="importResult.labels_created.length > 0" class="mb-3">
            <span class="font-medium">{{ $t('import.labelsCreated') }}:</span>
            <Tag v-for="l in importResult.labels_created" :key="l" :value="l" severity="info" class="ml-2" />
          </div>

          <div v-if="importResult.sprints_created.length > 0" class="mb-3">
            <span class="font-medium">{{ $t('import.sprintsCreated') }}:</span>
            <Tag v-for="s in importResult.sprints_created" :key="s" :value="s" severity="info" class="ml-2" />
          </div>

          <div v-if="importResult.errors.length > 0" class="mb-4">
            <h3 class="text-lg font-semibold mb-2 text-red-500">{{ $t('import.errors') }}</h3>
            <DataTable :value="importResult.errors" responsiveLayout="scroll" :paginator="importResult.errors.length > 10" :rows="10">
              <Column field="row_number" :header="$t('import.row')" style="width: 80px" />
              <Column field="external_key" :header="$t('import.key')" style="width: 120px" />
              <Column field="error" :header="$t('import.errorDetail')" />
            </DataTable>
          </div>

          <div class="flex justify-content-end">
            <Button :label="$t('import.goToTickets')" icon="pi pi-list" @click="goBack" />
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useToastService } from '@/composables/useToast'
import { getProject, type Project } from '@/api/projects'
import { getWorkflow, type WorkflowStatus } from '@/api/workflows'
import {
  analyzeImport,
  executeImport,
  type ImportAnalyzeResponse,
  type ImportResult,
  type ColumnMapping,
  type ValueMapping,
} from '@/api/importTickets'

import Button from 'primevue/button'
import Tag from 'primevue/tag'
import ProgressSpinner from 'primevue/progressspinner'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Select from 'primevue/select'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Checkbox from 'primevue/checkbox'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const toast = useToastService()

const projectId = computed(() => route.params.projectId as string)
const project = ref<Project | null>(null)
const loadingProject = ref(true)
const workflowStatuses = ref<WorkflowStatus[]>([])

const activeStep = ref(0)

const stepLabels = computed(() => [
  t('import.stepUpload'),
  t('import.stepColumns'),
  t('import.stepValues'),
  t('import.stepPreview'),
  t('import.stepResults'),
])

const inputMode = ref<'file' | 'paste'>('file')
const fileFormat = ref<'csv' | 'json'>('csv')

const rawText = ref('')
const fileName = ref('')
const fileSize = ref(0)
const dragOver = ref(false)
const analyzing = ref(false)
const executing = ref(false)

const analysis = ref<ImportAnalyzeResponse | null>(null)
const importResult = ref<ImportResult | null>(null)

const fileSizeFormatted = computed(() => {
  const s = fileSize.value
  if (s < 1024) return `${s} B`
  if (s < 1024 * 1024) return `${(s / 1024).toFixed(1)} KB`
  return `${(s / (1024 * 1024)).toFixed(1)} MB`
})

const hasContent = computed(() => {
  if (inputMode.value === 'file') return rawText.value.length > 0
  return rawText.value.trim().length > 0
})

const columnMappingRows = ref<{ source: string; target: string | null; sample: string }[]>([])

const TARGET_FIELDS = [
  { value: 'title', label: 'Title' },
  { value: 'description', label: 'Description' },
  { value: 'ticket_type', label: 'Type' },
  { value: 'priority', label: 'Priority' },
  { value: 'status', label: 'Status' },
  { value: 'assignee', label: 'Assignee' },
  { value: 'reporter', label: 'Reporter' },
  { value: 'labels', label: 'Labels' },
  { value: 'sprint', label: 'Sprint' },
  { value: 'story_points', label: 'Story Points' },
  { value: 'due_date', label: 'Due Date' },
  { value: 'start_date', label: 'Start Date' },
  { value: 'external_key', label: 'External Key' },
  { value: 'parent_key', label: 'Parent Key' },
  { value: 'resolution', label: 'Resolution' },
  { value: 'resolved_at', label: 'Resolved Date' },
  { value: 'created_date', label: 'Created Date' },
  { value: 'updated_date', label: 'Updated Date' },
]
const targetFieldOptions = computed(() => TARGET_FIELDS)

const ticketTypeOptions = [
  { value: 'task', label: 'Task' },
  { value: 'bug', label: 'Bug' },
  { value: 'story', label: 'Story' },
  { value: 'epic', label: 'Epic' },
  { value: 'subtask', label: 'Subtask' },
]
const priorityOptions = [
  { value: 'lowest', label: 'Lowest' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'highest', label: 'Highest' },
]
const workflowStatusOptions = computed(() =>
  workflowStatuses.value.map((ws) => ({ value: ws.id, label: ws.name })),
)

const valueMappingFields = ref<string[]>([])
const valueMappingData = ref<Record<string, { source: string; target: string | null }[]>>({})
const importOptions = ref({
  create_labels: true,
  create_sprints: false,
  skip_resolved: false,
})

function fieldLabel(field: string): string {
  const match = TARGET_FIELDS.find((f) => f.value === field)
  return match ? match.label : field
}

function getSampleValue(col: string): string {
  if (!analysis.value?.sample_rows?.length) return ''
  for (const row of analysis.value.sample_rows) {
    const val = row[col]
    if (val != null && val !== '') {
      const str = Array.isArray(val) ? val.filter(Boolean).join(', ') : String(val)
      return str.length > 80 ? str.substring(0, 80) + '...' : str
    }
  }
  return ''
}

function autoSuggestValueMappings(field: string, values: string[]): { source: string; target: string | null }[] {
  return values.map((v) => {
    let target: string | null = null
    if (field === 'ticket_type') {
      const lower = v.toLowerCase().replace(/[- ]/g, '')
      const map: Record<string, string> = { task: 'task', bug: 'bug', story: 'story', epic: 'epic', subtask: 'subtask' }
      target = map[lower] ?? null
    } else if (field === 'priority') {
      const lower = v.toLowerCase()
      const map: Record<string, string> = { highest: 'highest', high: 'high', medium: 'medium', low: 'low', lowest: 'lowest' }
      target = map[lower] ?? null
    } else if (field === 'status') {
      const lower = v.toLowerCase()
      const match = workflowStatuses.value.find((ws) => ws.name.toLowerCase() === lower)
      target = match?.id ?? null
    }
    return { source: v, target }
  })
}

const previewColumns = computed(() => {
  return columnMappingRows.value
    .filter((r) => r.target)
    .map((r) => r.target as string)
})

const previewRows = computed(() => {
  if (!analysis.value?.sample_rows) return []
  const colMap: Record<string, string> = {}
  for (const r of columnMappingRows.value) {
    if (r.target) colMap[r.source] = r.target
  }

  const valMaps: Record<string, Record<string, string | null>> = {}
  for (const [field, vms] of Object.entries(valueMappingData.value)) {
    valMaps[field] = {}
    for (const vm of vms) {
      valMaps[field][vm.source] = vm.target
    }
  }

  return analysis.value.sample_rows.slice(0, 10).map((raw) => {
    const mapped: Record<string, unknown> = {}
    for (const [src, tgt] of Object.entries(colMap)) {
      let val = raw[src]
      if (val == null) continue
      if (tgt in valMaps) {
        if (Array.isArray(val)) {
          val = val.map((v: string) => valMaps[tgt][v] ?? v)
        } else {
          val = valMaps[tgt][String(val)] ?? val
        }
      }
      mapped[tgt] = val
    }
    return mapped
  })
})

function formatPreviewValue(val: unknown): string {
  if (val == null) return ''
  if (Array.isArray(val)) return val.filter(Boolean).join(', ')
  const s = String(val)
  return s.length > 60 ? s.substring(0, 60) + '...' : s
}

async function handleFileSelect(e: Event) {
  const input = e.target as HTMLInputElement
  if (!input.files?.length) return
  await readFile(input.files[0])
}

function handleDrop(e: DragEvent) {
  dragOver.value = false
  if (!e.dataTransfer?.files?.length) return
  readFile(e.dataTransfer.files[0])
}

async function readFile(file: File) {
  if (file.size > 10 * 1024 * 1024) {
    toast.showError(t('import.fileTooLarge'), t('import.maxSize'))
    return
  }
  fileName.value = file.name
  fileSize.value = file.size
  if (file.name.endsWith('.json')) {
    fileFormat.value = 'json'
  } else {
    fileFormat.value = 'csv'
  }
  rawText.value = await file.text()
}

async function doAnalyze() {
  analyzing.value = true
  try {
    analysis.value = await analyzeImport(projectId.value, rawText.value, fileFormat.value)

    columnMappingRows.value = analysis.value.columns.map((col) => {
      const suggested = analysis.value!.suggested_mappings.find((m) => m.source_column === col)
      return {
        source: col,
        target: suggested?.target_field ?? null,
        sample: getSampleValue(col),
      }
    })

    activeStep.value = 1
  } catch (e: any) {
    toast.showError(t('import.analyzeFailed'), e?.response?.data?.detail || e.message)
  } finally {
    analyzing.value = false
  }
}

function goToValueMapping() {
  if (!analysis.value) return
  const mappedTargets = columnMappingRows.value
    .filter((r) => r.target)
    .map((r) => r.target as string)

  const enumFields = ['ticket_type', 'priority', 'status']
  const fields = enumFields.filter((f) => mappedTargets.includes(f))
  valueMappingFields.value = fields

  const data: Record<string, { source: string; target: string | null }[]> = {}
  for (const field of fields) {
    const values = analysis.value.unique_values[field] || []
    data[field] = autoSuggestValueMappings(field, values)
  }
  valueMappingData.value = data
  activeStep.value = 2
}

function goToPreview() {
  activeStep.value = 3
}

async function doExecute() {
  if (!analysis.value) return
  executing.value = true

  const colMappings: ColumnMapping[] = columnMappingRows.value
    .filter((r) => r.target)
    .map((r) => ({ source_column: r.source, target_field: r.target }))

  const valMappings: Record<string, ValueMapping[]> = {}
  for (const [field, vms] of Object.entries(valueMappingData.value)) {
    valMappings[field] = vms
      .filter((vm) => vm.target != null)
      .map((vm) => ({ source_value: vm.source, target_value: vm.target }))
  }

  try {
    importResult.value = await executeImport(projectId.value, {
      import_session_id: analysis.value.import_session_id,
      column_mappings: colMappings,
      value_mappings: valMappings,
      options: importOptions.value,
    })
    activeStep.value = 4
    toast.showSuccess(t('import.importComplete'), t('import.ticketsCreatedMsg', { count: importResult.value.tickets_created }))
  } catch (e: any) {
    toast.showError(t('import.executeFailed'), e?.response?.data?.detail || e.message)
  } finally {
    executing.value = false
  }
}

function goBack() {
  router.push({ name: 'ticket-list', params: { projectId: projectId.value } })
}

onMounted(async () => {
  try {
    project.value = await getProject(projectId.value)
    if (project.value?.default_workflow_id) {
      const wf = await getWorkflow(project.value.default_workflow_id)
      workflowStatuses.value = wf.statuses || []
    }
  } catch {
    toast.showError(t('tickets.projectNotFound'), '')
  } finally {
    loadingProject.value = false
  }
})
</script>

<style scoped>
.import-tickets-view {
  max-width: 1200px;
  margin: 0 auto;
}
</style>
