<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Select from 'primevue/select'
import Button from 'primevue/button'
import { getProjectAuditLog, type AuditEntry } from '@/api/audit'

const route = useRoute()
const projectId = route.params.projectId as string

const entries = ref<AuditEntry[]>([])
const total = ref(0)
const first = ref(0)
const rows = ref(25)
const loading = ref(false)

const actionFilter = ref<string | null>(null)

const ACTION_OPTIONS = [
  { label: 'All actions', value: null },
  { label: 'Created', value: 'created' },
  { label: 'Field change', value: 'field_change' },
  { label: 'Transition', value: 'transition' },
  { label: 'Comment added', value: 'comment_added' },
]

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return iso
  }
}

function actionSeverity(action: string): 'success' | 'info' | 'warning' | 'secondary' {
  if (action === 'created') return 'success'
  if (action === 'transition') return 'warning'
  if (action === 'field_change') return 'info'
  return 'secondary'
}

async function load() {
  loading.value = true
  try {
    const params: Record<string, unknown> = { offset: first.value, limit: rows.value }
    if (actionFilter.value) params.action = actionFilter.value
    const res = await getProjectAuditLog(projectId, params as { offset: number; limit: number; action?: string })
    entries.value = res.items
    total.value = res.total
  } finally {
    loading.value = false
  }
}

function onPage(e: { first: number; rows: number }) {
  first.value = e.first
  rows.value = e.rows
  load()
}

watch(actionFilter, () => {
  first.value = 0
  load()
})

onMounted(load)
</script>

<template>
  <div>
    <div class="flex align-items-center justify-content-between mb-4">
      <h2 class="m-0">{{ $t('audit.title') }}</h2>
      <Button icon="pi pi-refresh" text rounded @click="load" :loading="loading" />
    </div>

    <div class="flex gap-3 mb-3">
      <Select
        v-model="actionFilter"
        :options="ACTION_OPTIONS"
        option-label="label"
        option-value="value"
        :placeholder="$t('audit.filterAction')"
        class="w-14rem"
        show-clear
      />
    </div>

    <div class="surface-card p-4 border-round shadow-1">
      <DataTable
        :value="entries"
        :loading="loading"
        lazy
        paginator
        :rows="rows"
        :first="first"
        :total-records="total"
        data-key="id"
        striped-rows
        scrollable
        scroll-height="60vh"
        class="p-datatable-sm"
        :rows-per-page-options="[25, 50, 100]"
        @page="onPage"
      >
        <Column field="created_at" :header="$t('common.created')" style="width: 12rem">
          <template #body="{ data }">
            <span class="text-sm">{{ formatDate(data.created_at) }}</span>
          </template>
        </Column>
        <Column field="user_name" :header="$t('audit.user')" style="width: 10rem">
          <template #body="{ data }">
            <span class="text-sm">{{ data.user_name || $t('tickets.system') }}</span>
          </template>
        </Column>
        <Column field="action" :header="$t('audit.action')" style="width: 10rem">
          <template #body="{ data }">
            <Tag :value="data.action" :severity="actionSeverity(data.action)" />
          </template>
        </Column>
        <Column field="field_name" :header="$t('audit.field')" style="width: 10rem">
          <template #body="{ data }">
            <span class="text-sm font-mono">{{ data.field_name || '—' }}</span>
          </template>
        </Column>
        <Column :header="$t('audit.change')">
          <template #body="{ data }">
            <span v-if="data.old_value || data.new_value" class="text-sm">
              <span v-if="data.old_value" class="text-color-secondary line-through">{{ data.old_value }}</span>
              <span v-if="data.old_value && data.new_value"> → </span>
              <span v-if="data.new_value" class="font-medium">{{ data.new_value }}</span>
            </span>
            <span v-else class="text-color-secondary text-sm">—</span>
          </template>
        </Column>
      </DataTable>
    </div>
  </div>
</template>
