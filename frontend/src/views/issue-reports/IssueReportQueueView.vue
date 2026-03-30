<template>
  <div>
    <div class="flex align-items-center justify-content-between mb-4">
      <h1 class="text-2xl font-bold m-0">{{ $t('issueReports.queue') }}</h1>
      <Button
        :label="$t('issueReports.reportIssue')"
        icon="pi pi-plus"
        @click="showReportDialog = true"
      />
    </div>

    <div class="surface-card p-4 border-round shadow-1">
      <div class="flex gap-3 mb-3 flex-wrap align-items-end">
        <div>
          <label class="block text-sm font-semibold mb-1">{{ $t('issueReports.status') }}</label>
          <Select
            v-model="filters.status"
            :options="statusOptions"
            option-label="label"
            option-value="value"
            :placeholder="$t('common.status')"
            show-clear
            class="w-10rem"
          />
        </div>
        <div>
          <label class="block text-sm font-semibold mb-1">{{ $t('issueReports.priority') }}</label>
          <Select
            v-model="filters.priority"
            :options="priorityOptions"
            option-label="label"
            option-value="value"
            :placeholder="$t('issueReports.priority')"
            show-clear
            class="w-10rem"
          />
        </div>
        <div class="flex-1" style="min-width: 200px">
          <label class="block text-sm font-semibold mb-1">{{ $t('common.search') }}</label>
          <InputText
            v-model="filters.q"
            :placeholder="$t('common.search')"
            class="w-full"
            @keyup.enter="loadReports"
          />
        </div>
        <Button
          :label="$t('common.search')"
          icon="pi pi-search"
          severity="secondary"
          @click="loadReports"
        />
      </div>

      <div v-if="selectedReports.length > 0" class="flex align-items-center gap-2 mb-3">
        <Tag severity="info">{{ $t('issueReports.selectedCount', { count: selectedReports.length }) }}</Tag>
        <Button
          :label="$t('issueReports.createTicketFromSelected')"
          icon="pi pi-ticket"
          size="small"
          @click="showCreateTicketDialog = true"
        />
      </div>

      <DataTable
        v-model:selection="selectedReports"
        :value="reports"
        :loading="loading"
        :rows="pageSize"
        :total-records="totalRecords"
        :lazy="true"
        paginator
        data-key="id"
        striped-rows
        @page="onPage"
        @sort="onSort"
      >
        <Column selection-mode="multiple" header-style="width: 3rem" />
        <Column field="title" :header="$t('issueReports.reportTitle')" :sortable="false">
          <template #body="{ data: row }">
            <router-link
              :to="`/projects/${projectId}/issue-reports/${row.id}`"
              class="font-semibold text-primary no-underline hover:underline"
            >
              {{ row.title }}
            </router-link>
          </template>
        </Column>
        <Column field="status" :header="$t('issueReports.status')" style="width: 8rem">
          <template #body="{ data: row }">
            <Tag :severity="statusSeverity(row.status)" :value="statusLabel(row.status)" />
          </template>
        </Column>
        <Column field="priority" :header="$t('issueReports.priority')" style="width: 7rem">
          <template #body="{ data: row }">
            <Tag :severity="prioritySeverity(row.priority)" :value="priorityLabel(row.priority)" />
          </template>
        </Column>
        <Column field="reporter_count" :header="$t('issueReports.reporterCount')" style="width: 7rem" :sortable="false">
          <template #body="{ data: row }">
            <span class="flex align-items-center gap-1">
              <i class="pi pi-users text-xs" />
              {{ row.reporter_count }}
            </span>
          </template>
        </Column>
        <Column field="created_at" :header="$t('issueReports.created')" style="width: 10rem" :sortable="false">
          <template #body="{ data: row }">
            {{ formatDate(row.created_at) }}
          </template>
        </Column>
      </DataTable>
    </div>

    <ReportIssueDialog
      v-model:visible="showReportDialog"
      :project-id="projectId"
      @created="onReportCreated"
    />

    <CreateTicketFromReportsDialog
      v-model:visible="showCreateTicketDialog"
      :project-id="projectId"
      :selected-reports="selectedReports"
      @created="onTicketCreated"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import Button from 'primevue/button'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import Tag from 'primevue/tag'
import { listIssueReports, type IssueReport } from '@/api/issue-reports'
import { useToastService } from '@/composables/useToast'
import ReportIssueDialog from '@/components/issue-reports/ReportIssueDialog.vue'
import CreateTicketFromReportsDialog from '@/components/issue-reports/CreateTicketFromReportsDialog.vue'

const { t } = useI18n()
const route = useRoute()
const toast = useToastService()

const projectId = computed(() => route.params.projectId as string)

const reports = ref<IssueReport[]>([])
const selectedReports = ref<IssueReport[]>([])
const loading = ref(false)
const totalRecords = ref(0)
const pageSize = ref(50)
const currentPage = ref(0)
const sortField = ref('created_at')
const sortOrder = ref('desc')

const showReportDialog = ref(false)
const showCreateTicketDialog = ref(false)

const filters = ref({
  status: null as string | null,
  priority: null as string | null,
  q: '',
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
  const map: Record<string, string> = {
    open: 'info',
    reviewing: 'warn',
    ticket_created: 'success',
    dismissed: 'secondary',
  }
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
  const map: Record<string, string> = {
    low: 'secondary',
    medium: 'info',
    high: 'warn',
    critical: 'danger',
  }
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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

async function loadReports() {
  loading.value = true
  try {
    const result = await listIssueReports(projectId.value, {
      status: filters.value.status ?? undefined,
      priority: filters.value.priority ?? undefined,
      q: filters.value.q || undefined,
      sort_by: sortField.value,
      sort_dir: sortOrder.value,
      offset: currentPage.value * pageSize.value,
      limit: pageSize.value,
    })
    reports.value = result.items
    totalRecords.value = result.total
  } catch {
    toast.showError(t('common.error'), '')
  } finally {
    loading.value = false
  }
}

function onPage(event: { first: number; rows: number }) {
  currentPage.value = Math.floor(event.first / event.rows)
  pageSize.value = event.rows
  loadReports()
}

function onSort(event: { sortField: string; sortOrder: number }) {
  sortField.value = event.sortField || 'created_at'
  sortOrder.value = event.sortOrder === 1 ? 'asc' : 'desc'
  loadReports()
}

function onReportCreated() {
  showReportDialog.value = false
  loadReports()
}

function onTicketCreated() {
  showCreateTicketDialog.value = false
  selectedReports.value = []
  loadReports()
}

watch(() => [filters.value.status, filters.value.priority], () => {
  currentPage.value = 0
  loadReports()
})

onMounted(() => loadReports())
</script>
