<template>
  <Dialog
    :visible="visible"
    :header="$t('issueReports.newReport')"
    modal
    :style="{ width: '44rem', maxWidth: '95vw' }"
    @update:visible="$emit('update:visible', $event)"
  >
    <div class="flex flex-column gap-3">
      <div>
        <label class="block text-sm font-semibold mb-1">{{ $t('issueReports.reportTitle') }} *</label>
        <InputText
          v-model="form.title"
          class="w-full"
          :placeholder="$t('issueReports.reportTitle')"
          autofocus
          @blur="searchSimilar"
          @keyup.enter="searchSimilar"
        />
      </div>

      <SimilarReportsPanel
        :reports="similarReports"
        :loading="searchingSimlar"
        :searched="hasSearched"
        @select="onSelectSimilar"
      />

      <div v-if="addingToExisting">
        <p class="text-sm font-semibold mb-1">{{ $t('issueReports.yourDescription') }}</p>
        <Textarea
          v-model="meeTooDescription"
          class="w-full"
          :rows="3"
          :placeholder="$t('issueReports.yourDescription')"
        />
        <div class="flex gap-2 mt-2 justify-content-end">
          <Button :label="$t('common.cancel')" severity="secondary" text @click="cancelMeToo" />
          <Button
            :label="$t('issueReports.addAsReporter')"
            icon="pi pi-check"
            :loading="submitting"
            @click="submitMeToo"
          />
        </div>
      </div>

      <template v-if="!addingToExisting">
        <div>
          <label class="block text-sm font-semibold mb-1">{{ $t('issueReports.reportDescription') }}</label>
          <Textarea
            v-model="form.description"
            class="w-full"
            :rows="4"
            :placeholder="$t('issueReports.reportDescription')"
          />
        </div>

        <div>
          <label class="block text-sm font-semibold mb-1">{{ $t('issueReports.sourceUrl') }}</label>
          <InputText
            v-model="form.source_url"
            class="w-full"
            :placeholder="$t('issueReports.sourceUrlPlaceholder')"
          />
        </div>

        <div>
          <label class="block text-sm font-semibold mb-1">{{ $t('issueReports.priority') }}</label>
          <Select
            v-model="form.priority"
            :options="priorityOptions"
            option-label="label"
            option-value="value"
            class="w-full"
          />
        </div>

        <div>
          <label class="block text-sm font-semibold mb-1">{{ $t('issueReports.labels') }}</label>
          <MultiSelect
            v-model="form.label_ids"
            :options="projectLabels"
            option-label="name"
            option-value="id"
            :placeholder="$t('issueReports.selectLabels')"
            class="w-full"
            display="chip"
            :showToggleAll="false"
          >
            <template #option="{ option }">
              <div class="flex align-items-center gap-2">
                <span
                  class="inline-block border-circle"
                  :style="{ background: option.color, width: '0.75rem', height: '0.75rem' }"
                />
                <span>{{ option.name }}</span>
              </div>
            </template>
            <template #footer>
              <div class="p-2 border-top-1 surface-border">
                <div v-if="!creatingNewLabel">
                  <Button
                    :label="$t('issueReports.createNewLabel')"
                    icon="pi pi-plus"
                    size="small"
                    text
                    class="w-full"
                    @click.stop="creatingNewLabel = true"
                  />
                </div>
                <div v-else class="flex flex-column gap-2 p-1" @click.stop>
                  <InputText
                    v-model="newLabelName"
                    class="w-full"
                    :placeholder="$t('issueReports.labelNamePlaceholder')"
                    @click.stop
                    @keydown.stop
                  />
                  <div class="flex align-items-center gap-2">
                    <input
                      v-model="newLabelColor"
                      type="color"
                      class="border-round"
                      style="width: 2rem; height: 2rem; padding: 2px; cursor: pointer; border: 1px solid var(--p-content-border-color);"
                      @click.stop
                    />
                    <Tag
                      :value="newLabelName || $t('issueReports.labelPreview')"
                      :style="{ background: newLabelColor, color: '#fff', borderColor: newLabelColor }"
                      class="text-xs"
                    />
                  </div>
                  <div class="flex gap-2">
                    <Button
                      :label="$t('common.save')"
                      icon="pi pi-check"
                      size="small"
                      :loading="savingNewLabel"
                      :disabled="!newLabelName.trim()"
                      @click.stop="createAndAddLabel"
                    />
                    <Button
                      :label="$t('common.cancel')"
                      size="small"
                      severity="secondary"
                      text
                      @click.stop="creatingNewLabel = false"
                    />
                  </div>
                </div>
              </div>
            </template>
          </MultiSelect>
        </div>

        <div>
          <label class="block text-sm font-semibold mb-1">{{ $t('issueReports.attachments') }}</label>
          <div
            class="upload-dropzone"
            :class="{ 'upload-dropzone-active': isDragging }"
            @click="fileInputRef?.click()"
            @dragenter.prevent="isDragging = true"
            @dragover.prevent="isDragging = true"
            @dragleave.prevent="isDragging = false"
            @drop.prevent="onDrop"
          >
            <i class="pi pi-cloud-upload text-2xl text-color-secondary" />
            <span class="text-sm text-color-secondary">{{ $t('issueReports.dropFilesHere') }}</span>
            <small class="text-color-secondary">{{ $t('issueReports.maxFileSize') }}</small>
          </div>
          <input
            ref="fileInputRef"
            type="file"
            multiple
            accept="image/*"
            class="hidden"
            @change="onFileSelect"
          />
          <div v-if="pendingFiles.length > 0" class="flex flex-column gap-2 mt-2">
            <div
              v-for="(pf, idx) in pendingFiles"
              :key="idx"
              class="flex align-items-center gap-2 surface-ground p-2 border-round text-sm"
            >
              <i class="pi pi-image text-color-secondary" />
              <span class="flex-1 text-overflow-ellipsis overflow-hidden white-space-nowrap">{{ pf.name }}</span>
              <span class="text-color-secondary text-xs">{{ formatSize(pf.size) }}</span>
              <Button
                icon="pi pi-times"
                text
                rounded
                severity="danger"
                size="small"
                @click="removePendingFile(idx)"
              />
            </div>
          </div>
        </div>
      </template>
    </div>

    <template v-if="!addingToExisting" #footer>
      <Button :label="$t('common.cancel')" severity="secondary" text @click="$emit('update:visible', false)" />
      <Button
        :label="$t('common.submit')"
        icon="pi pi-check"
        :loading="submitting"
        :disabled="!form.title.trim()"
        @click="submitReport"
      />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import MultiSelect from 'primevue/multiselect'
import Select from 'primevue/select'
import Tag from 'primevue/tag'
import Textarea from 'primevue/textarea'
import {
  createIssueReport,
  createIssueReportAttachment,
  uploadToPresignedUrl,
  findSimilarReports,
  addReporter,
  formatFileSize,
  type SimilarReport,
} from '@/api/issue-reports'
import { listLabels, createLabel, type Label } from '@/api/labels'
import { useToastService } from '@/composables/useToast'
import SimilarReportsPanel from './SimilarReportsPanel.vue'

const props = defineProps<{
  visible: boolean
  projectId: string
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  created: []
}>()

const { t } = useI18n()
const toast = useToastService()

const form = ref({
  title: '',
  description: '',
  priority: 'medium',
  source_url: '',
  label_ids: [] as string[],
})

const similarReports = ref<SimilarReport[]>([])
const searchingSimlar = ref(false)
const hasSearched = ref(false)
const addingToExisting = ref(false)
const selectedReport = ref<SimilarReport | null>(null)
const meeTooDescription = ref('')
const submitting = ref(false)

const projectLabels = ref<Label[]>([])
const pendingFiles = ref<File[]>([])
const fileInputRef = ref<HTMLInputElement | null>(null)
const isDragging = ref(false)
const creatingNewLabel = ref(false)
const newLabelName = ref('')
const newLabelColor = ref('#6366F1')
const savingNewLabel = ref(false)

const priorityOptions = [
  { label: t('issueReports.low'), value: 'low' },
  { label: t('issueReports.medium'), value: 'medium' },
  { label: t('issueReports.high'), value: 'high' },
  { label: t('issueReports.critical'), value: 'critical' },
]

let searchTimeout: ReturnType<typeof setTimeout> | null = null

function formatSize(bytes: number) {
  return formatFileSize(bytes)
}

async function loadLabels() {
  try {
    projectLabels.value = await listLabels(props.projectId)
  } catch {
    projectLabels.value = []
  }
}

async function createAndAddLabel() {
  if (!newLabelName.value.trim()) return
  savingNewLabel.value = true
  try {
    const created = await createLabel(props.projectId, {
      name: newLabelName.value.trim(),
      color: newLabelColor.value,
    })
    projectLabels.value = [...projectLabels.value, created].sort((a, b) => a.name.localeCompare(b.name))
    form.value.label_ids = [...form.value.label_ids, created.id]
    newLabelName.value = ''
    newLabelColor.value = '#6366F1'
    creatingNewLabel.value = false
  } catch {
    toast.showError(t('common.error'), '')
  } finally {
    savingNewLabel.value = false
  }
}

function onFileSelect(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files) {
    pendingFiles.value.push(...Array.from(input.files))
    input.value = ''
  }
}

function onDrop(e: DragEvent) {
  isDragging.value = false
  if (e.dataTransfer?.files) {
    pendingFiles.value.push(...Array.from(e.dataTransfer.files))
  }
}

function removePendingFile(idx: number) {
  pendingFiles.value.splice(idx, 1)
}

async function searchSimilar() {
  const q = form.value.title.trim()
  if (!q || q.length < 3) {
    similarReports.value = []
    hasSearched.value = false
    return
  }

  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(async () => {
    searchingSimlar.value = true
    try {
      similarReports.value = await findSimilarReports(props.projectId, q)
      hasSearched.value = true
    } catch {
      similarReports.value = []
    } finally {
      searchingSimlar.value = false
    }
  }, 300)
}

function onSelectSimilar(report: SimilarReport) {
  selectedReport.value = report
  addingToExisting.value = true
  meeTooDescription.value = form.value.description || ''
}

function cancelMeToo() {
  addingToExisting.value = false
  selectedReport.value = null
}

async function submitMeToo() {
  if (!selectedReport.value) return
  submitting.value = true
  try {
    await addReporter(props.projectId, selectedReport.value.id, {
      original_description: meeTooDescription.value || undefined,
    })
    toast.showSuccess(t('issueReports.reporterAdded'), '')
    resetForm()
    emit('created')
  } catch {
    toast.showError(t('common.error'), '')
  } finally {
    submitting.value = false
  }
}

async function submitReport() {
  submitting.value = true
  try {
    const report = await createIssueReport(props.projectId, {
      title: form.value.title,
      description: form.value.description || undefined,
      priority: form.value.priority,
      source_url: form.value.source_url || undefined,
      label_ids: form.value.label_ids.length > 0 ? form.value.label_ids : undefined,
    })

    if (pendingFiles.value.length > 0) {
      for (const file of pendingFiles.value) {
        try {
          const { upload_url } = await createIssueReportAttachment(
            props.projectId,
            report.id,
            { filename: file.name, content_type: file.type || 'application/octet-stream', size_bytes: file.size },
          )
          await uploadToPresignedUrl(upload_url, file)
        } catch {
          toast.showError(t('issueReports.uploadFailed'), file.name)
        }
      }
    }

    toast.showSuccess(t('issueReports.reportCreated'), '')
    resetForm()
    emit('created')
  } catch {
    toast.showError(t('common.error'), '')
  } finally {
    submitting.value = false
  }
}

function resetForm() {
  form.value = { title: '', description: '', priority: 'medium', source_url: '', label_ids: [] }
  similarReports.value = []
  hasSearched.value = false
  addingToExisting.value = false
  selectedReport.value = null
  meeTooDescription.value = ''
  pendingFiles.value = []
  creatingNewLabel.value = false
  newLabelName.value = ''
  newLabelColor.value = '#6366F1'
}

watch(() => props.visible, (v) => {
  if (v) {
    resetForm()
    loadLabels()
  }
})

onMounted(() => {
  if (props.visible) loadLabels()
})
</script>

<style scoped>
.upload-dropzone {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.375rem;
  padding: 1.25rem;
  border: 2px dashed var(--p-content-border-color);
  border-radius: 8px;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.upload-dropzone:hover,
.upload-dropzone-active {
  border-color: var(--p-primary-color);
  background: color-mix(in srgb, var(--p-primary-color) 5%, transparent);
}
</style>
