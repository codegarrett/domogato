<template>
  <div v-if="loading" class="flex justify-content-center p-6">
    <ProgressSpinner />
  </div>
  <div v-else-if="report">
    <div class="flex align-items-center gap-3 mb-4">
      <Button icon="pi pi-arrow-left" text @click="router.back()" />
      <h1 class="text-2xl font-bold m-0 flex-1">{{ report.title }}</h1>
      <Tag :severity="statusSeverity(report.status)" :value="statusLabel(report.status)" />
    </div>

    <div class="grid">
      <div class="col-12 lg:col-8">
        <div class="surface-card p-4 border-round shadow-1 mb-4">
          <h2 class="text-lg font-semibold mb-3">{{ $t('issueReports.reportDescription') }}</h2>
          <div v-if="!editing" class="text-color-secondary whitespace-pre-wrap">
            {{ report.description || '—' }}
          </div>
          <div v-else class="flex flex-column gap-2">
            <InputText v-model="editForm.title" class="w-full font-semibold" />
            <Textarea v-model="editForm.description" class="w-full" :rows="6" />
            <div>
              <label class="block text-sm font-semibold mb-1">{{ $t('issueReports.sourceUrl') }}</label>
              <InputText v-model="editForm.source_url" class="w-full" :placeholder="$t('issueReports.sourceUrlPlaceholder')" />
            </div>
            <div class="flex gap-3">
              <div class="flex-1">
                <label class="block text-sm font-semibold mb-1">{{ $t('issueReports.priority') }}</label>
                <Select
                  v-model="editForm.priority"
                  :options="priorityOptions"
                  option-label="label"
                  option-value="value"
                  class="w-full"
                />
              </div>
              <div class="flex-1">
                <label class="block text-sm font-semibold mb-1">{{ $t('issueReports.status') }}</label>
                <Select
                  v-model="editForm.status"
                  :options="statusOptions"
                  option-label="label"
                  option-value="value"
                  class="w-full"
                />
              </div>
            </div>
            <div class="flex gap-2 justify-content-end">
              <Button :label="$t('common.cancel')" severity="secondary" text @click="editing = false" />
              <Button :label="$t('common.save')" icon="pi pi-check" :loading="saving" @click="saveEdit" />
            </div>
          </div>
        </div>

        <!-- Source URL -->
        <div v-if="report.source_url && !editing" class="surface-card p-4 border-round shadow-1 mb-4">
          <h2 class="text-lg font-semibold mb-2">{{ $t('issueReports.sourceUrl') }}</h2>
          <a :href="report.source_url" target="_blank" rel="noopener" class="text-primary no-underline hover:underline text-sm break-all">
            <i class="pi pi-external-link mr-1" />{{ report.source_url }}
          </a>
        </div>

        <!-- Attachments -->
        <div class="surface-card p-4 border-round shadow-1 mb-4">
          <div class="flex align-items-center justify-content-between mb-3">
            <h2 class="text-lg font-semibold m-0">{{ $t('issueReports.attachments') }}</h2>
            <Button
              :label="$t('issueReports.uploadScreenshots')"
              icon="pi pi-cloud-upload"
              size="small"
              severity="secondary"
              @click="attachFileInput?.click()"
            />
            <input
              ref="attachFileInput"
              type="file"
              multiple
              accept="image/*"
              class="hidden"
              @change="onUploadFiles"
            />
          </div>
          <div v-if="uploading" class="flex align-items-center gap-2 text-color-secondary text-sm mb-2">
            <i class="pi pi-spin pi-spinner" /> {{ $t('issueReports.uploadingFiles') }}
          </div>
          <div v-if="report.attachments.length === 0 && !uploading" class="text-sm text-color-secondary">
            {{ $t('issueReports.noAttachments') }}
          </div>
          <div v-else class="flex flex-column gap-2">
            <div
              v-for="att in report.attachments"
              :key="att.id"
              class="flex align-items-center gap-2 surface-ground p-2 border-round text-sm"
            >
              <i :class="att.content_type.startsWith('image/') ? 'pi pi-image' : 'pi pi-file'" class="text-color-secondary" />
              <span class="flex-1 text-overflow-ellipsis overflow-hidden white-space-nowrap">{{ att.filename }}</span>
              <span class="text-color-secondary text-xs">{{ formatSize(att.size_bytes) }}</span>
              <Button
                icon="pi pi-download"
                text
                rounded
                size="small"
                :aria-label="$t('issueReports.download')"
                @click="downloadAttachment(att.id)"
              />
              <Button
                icon="pi pi-trash"
                text
                rounded
                severity="danger"
                size="small"
                :aria-label="$t('issueReports.deleteAttachment')"
                @click="removeAttachment(att.id)"
              />
            </div>
          </div>
        </div>

        <!-- Reporters -->
        <div class="surface-card p-4 border-round shadow-1 mb-4">
          <h2 class="text-lg font-semibold mb-3">{{ $t('issueReports.reporters') }} ({{ report.reporter_count }})</h2>
          <div
            v-for="reporter in report.reporters"
            :key="reporter.user_id"
            class="flex align-items-start gap-3 p-3 border-bottom-1 surface-border"
          >
            <Avatar
              :label="(reporter.display_name || '?').charAt(0).toUpperCase()"
              shape="circle"
              size="normal"
            />
            <div class="flex-1">
              <div class="font-semibold text-sm">{{ reporter.display_name || 'Unknown' }}</div>
              <div class="text-xs text-color-secondary">{{ formatDateTime(reporter.created_at) }}</div>
              <p v-if="reporter.original_description" class="text-sm mt-1 text-color-secondary">
                {{ reporter.original_description }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div class="col-12 lg:col-4">
        <div class="surface-card p-4 border-round shadow-1 mb-4">
          <h3 class="text-base font-semibold mb-3">Details</h3>
          <div class="flex flex-column gap-2 text-sm">
            <div class="flex justify-content-between">
              <span class="text-color-secondary">{{ $t('issueReports.priority') }}</span>
              <Tag :severity="prioritySeverity(report.priority)" :value="priorityLabel(report.priority)" />
            </div>
            <div class="flex justify-content-between">
              <span class="text-color-secondary">{{ $t('issueReports.createdBy') }}</span>
              <span v-if="report.created_by_name">{{ report.created_by_name }}</span>
              <span v-else-if="report.reporter_name || report.reporter_email" class="text-right">
                <span>{{ report.reporter_name || $t('issueReports.anonymous') }}</span>
                <div v-if="report.reporter_email" class="text-xs text-color-secondary">{{ report.reporter_email }}</div>
              </span>
              <Tag v-else value="API" severity="secondary" class="text-xs" />
            </div>
            <div class="flex justify-content-between">
              <span class="text-color-secondary">{{ $t('issueReports.created') }}</span>
              <span>{{ formatDateTime(report.created_at) }}</span>
            </div>
          </div>

          <!-- Labels -->
          <div v-if="report.labels.length > 0" class="mt-3">
            <div class="text-sm text-color-secondary mb-1">{{ $t('issueReports.labels') }}</div>
            <div class="flex flex-wrap gap-1">
              <Tag
                v-for="lbl in report.labels"
                :key="lbl.id"
                :value="lbl.name"
                :style="{ background: lbl.color + '22', color: lbl.color, border: `1px solid ${lbl.color}44` }"
                class="text-xs"
              />
            </div>
          </div>

          <div class="flex flex-column gap-2 mt-4">
            <Button
              v-if="!editing"
              :label="$t('common.edit')"
              icon="pi pi-pencil"
              severity="secondary"
              size="small"
              class="w-full"
              @click="startEdit"
            />
            <Button
              v-if="report.status !== 'ticket_created'"
              :label="$t('issueReports.createTicket')"
              icon="pi pi-ticket"
              size="small"
              class="w-full"
              @click="showCreateTicketDialog = true"
            />
            <Button
              v-if="report.status === 'open' || report.status === 'reviewing'"
              :label="$t('issueReports.dismiss')"
              icon="pi pi-times"
              severity="danger"
              text
              size="small"
              class="w-full"
              @click="dismissReport"
            />
          </div>
        </div>

        <div class="surface-card p-4 border-round shadow-1">
          <h3 class="text-base font-semibold mb-3">{{ $t('issueReports.linkedTickets') }}</h3>
          <div v-if="report.linked_tickets.length === 0" class="text-sm text-color-secondary">
            {{ $t('issueReports.noLinkedTickets') }}
          </div>
          <router-link
            v-for="link in report.linked_tickets"
            :key="link.ticket_id"
            :to="`/tickets/${link.ticket_id}`"
            class="linked-ticket-item block p-2 border-round mb-1 no-underline"
          >
            <div class="font-semibold text-sm text-primary">{{ link.ticket_key || link.ticket_id }}</div>
            <div v-if="link.ticket_title" class="text-xs text-color-secondary mt-1">{{ link.ticket_title }}</div>
          </router-link>
        </div>
      </div>
    </div>

    <CreateTicketFromReportsDialog
      v-model:visible="showCreateTicketDialog"
      :project-id="projectId"
      :selected-reports="[report]"
      @created="onTicketCreated"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import Avatar from 'primevue/avatar'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import ProgressSpinner from 'primevue/progressspinner'
import Select from 'primevue/select'
import Tag from 'primevue/tag'
import Textarea from 'primevue/textarea'
import {
  getIssueReport,
  updateIssueReport,
  deleteIssueReport,
  createIssueReportAttachment,
  uploadToPresignedUrl,
  getIssueReportAttachmentDownloadUrl,
  deleteIssueReportAttachment,
  formatFileSize,
  type IssueReport,
} from '@/api/issue-reports'
import { useToastService } from '@/composables/useToast'
import CreateTicketFromReportsDialog from '@/components/issue-reports/CreateTicketFromReportsDialog.vue'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const toast = useToastService()

const projectId = computed(() => route.params.projectId as string)
const reportId = computed(() => route.params.reportId as string)

const report = ref<IssueReport | null>(null)
const loading = ref(true)
const editing = ref(false)
const saving = ref(false)
const uploading = ref(false)
const showCreateTicketDialog = ref(false)
const attachFileInput = ref<HTMLInputElement | null>(null)

const editForm = ref({
  title: '',
  description: '',
  priority: 'medium',
  status: 'open',
  source_url: '',
})

const statusOptions = [
  { label: t('issueReports.open'), value: 'open' },
  { label: t('issueReports.reviewing'), value: 'reviewing' },
  { label: t('issueReports.ticketCreatedStatus'), value: 'ticket_created' },
  { label: t('issueReports.dismissed'), value: 'dismissed' },
]

const priorityOptions = [
  { label: t('issueReports.low'), value: 'low' },
  { label: t('issueReports.medium'), value: 'medium' },
  { label: t('issueReports.high'), value: 'high' },
  { label: t('issueReports.critical'), value: 'critical' },
]

function statusSeverity(s: string): string {
  const map: Record<string, string> = { open: 'info', reviewing: 'warn', ticket_created: 'success', dismissed: 'secondary' }
  return map[s] ?? 'info'
}

function statusLabel(s: string): string {
  const map: Record<string, string> = {
    open: t('issueReports.open'),
    reviewing: t('issueReports.reviewing'),
    ticket_created: t('issueReports.ticketCreatedStatus'),
    dismissed: t('issueReports.dismissed'),
  }
  return map[s] ?? s
}

function prioritySeverity(p: string): string {
  const map: Record<string, string> = { low: 'secondary', medium: 'info', high: 'warn', critical: 'danger' }
  return map[p] ?? 'info'
}

function priorityLabel(p: string): string {
  const map: Record<string, string> = {
    low: t('issueReports.low'),
    medium: t('issueReports.medium'),
    high: t('issueReports.high'),
    critical: t('issueReports.critical'),
  }
  return map[p] ?? p
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function formatSize(bytes: number) {
  return formatFileSize(bytes)
}

async function loadReport() {
  loading.value = true
  try {
    report.value = await getIssueReport(projectId.value, reportId.value)
  } catch {
    toast.showError(t('common.error'), '')
  } finally {
    loading.value = false
  }
}

function startEdit() {
  if (!report.value) return
  editForm.value = {
    title: report.value.title,
    description: report.value.description || '',
    priority: report.value.priority,
    status: report.value.status,
    source_url: report.value.source_url || '',
  }
  editing.value = true
}

async function saveEdit() {
  saving.value = true
  try {
    report.value = await updateIssueReport(projectId.value, reportId.value, {
      title: editForm.value.title,
      description: editForm.value.description || undefined,
      priority: editForm.value.priority,
      status: editForm.value.status,
      source_url: editForm.value.source_url || undefined,
    })
    editing.value = false
    await loadReport()
    toast.showSuccess(t('common.saved'), '')
  } catch {
    toast.showError(t('common.saveFailed'), '')
  } finally {
    saving.value = false
  }
}

async function onUploadFiles(e: Event) {
  const input = e.target as HTMLInputElement
  if (!input.files || !report.value) return
  uploading.value = true
  try {
    for (const file of Array.from(input.files)) {
      const { upload_url } = await createIssueReportAttachment(
        projectId.value,
        report.value.id,
        { filename: file.name, content_type: file.type || 'application/octet-stream', size_bytes: file.size },
      )
      await uploadToPresignedUrl(upload_url, file)
    }
    toast.showSuccess(t('issueReports.uploadSuccess'), '')
    await loadReport()
  } catch {
    toast.showError(t('issueReports.uploadFailed'), '')
  } finally {
    uploading.value = false
    input.value = ''
  }
}

async function downloadAttachment(attachmentId: string) {
  try {
    const url = await getIssueReportAttachmentDownloadUrl(attachmentId)
    window.open(url, '_blank')
  } catch {
    toast.showError(t('common.error'), '')
  }
}

async function removeAttachment(attachmentId: string) {
  try {
    await deleteIssueReportAttachment(attachmentId)
    await loadReport()
  } catch {
    toast.showError(t('common.error'), '')
  }
}

async function dismissReport() {
  try {
    await deleteIssueReport(projectId.value, reportId.value)
    toast.showSuccess(t('issueReports.dismissed'), '')
    router.back()
  } catch {
    toast.showError(t('common.error'), '')
  }
}

function onTicketCreated() {
  showCreateTicketDialog.value = false
  loadReport()
}

onMounted(() => loadReport())
</script>

<style scoped>
.linked-ticket-item {
  transition: background 0.15s;
}
.linked-ticket-item:hover {
  background: var(--p-content-hover-background, var(--p-surface-100));
}
</style>
