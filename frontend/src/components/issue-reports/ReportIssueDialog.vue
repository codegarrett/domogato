<template>
  <Dialog
    :visible="visible"
    :header="$t('issueReports.newReport')"
    modal
    :style="{ width: '40rem', maxWidth: '95vw' }"
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
            :rows="5"
            :placeholder="$t('issueReports.reportDescription')"
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
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import Textarea from 'primevue/textarea'
import {
  createIssueReport,
  findSimilarReports,
  addReporter,
  type SimilarReport,
} from '@/api/issue-reports'
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
})

const similarReports = ref<SimilarReport[]>([])
const searchingSimlar = ref(false)
const hasSearched = ref(false)
const addingToExisting = ref(false)
const selectedReport = ref<SimilarReport | null>(null)
const meeTooDescription = ref('')
const submitting = ref(false)

const priorityOptions = [
  { label: t('issueReports.low'), value: 'low' },
  { label: t('issueReports.medium'), value: 'medium' },
  { label: t('issueReports.high'), value: 'high' },
  { label: t('issueReports.critical'), value: 'critical' },
]

let searchTimeout: ReturnType<typeof setTimeout> | null = null

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
    await createIssueReport(props.projectId, {
      title: form.value.title,
      description: form.value.description || undefined,
      priority: form.value.priority,
    })
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
  form.value = { title: '', description: '', priority: 'medium' }
  similarReports.value = []
  hasSearched.value = false
  addingToExisting.value = false
  selectedReport.value = null
  meeTooDescription.value = ''
}

watch(() => props.visible, (v) => {
  if (v) resetForm()
})
</script>
