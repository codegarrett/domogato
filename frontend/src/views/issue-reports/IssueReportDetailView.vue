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
              <span>{{ report.created_by_name || '—' }}</span>
            </div>
            <div class="flex justify-content-between">
              <span class="text-color-secondary">{{ $t('issueReports.created') }}</span>
              <span>{{ formatDateTime(report.created_at) }}</span>
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
          <div
            v-for="link in report.linked_tickets"
            :key="link.ticket_id"
            class="p-2 border-round surface-hover mb-1"
          >
            <router-link
              :to="`/tickets/${link.ticket_id}`"
              class="font-semibold text-sm text-primary no-underline hover:underline"
            >
              {{ link.ticket_key || link.ticket_id }}
            </router-link>
            <div v-if="link.ticket_title" class="text-xs text-color-secondary mt-1">{{ link.ticket_title }}</div>
          </div>
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
const showCreateTicketDialog = ref(false)

const editForm = ref({
  title: '',
  description: '',
  priority: 'medium',
  status: 'open',
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
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
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
