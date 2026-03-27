<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import LineChart from '@/components/charts/LineChart.vue'
import { getSprintReport, getBurndownReport, type SprintReport, type BurndownReport } from '@/api/reports'

const route = useRoute()
const { t } = useI18n()
const projectId = route.params.projectId as string
const sprintId = route.params.sprintId as string

const report = ref<SprintReport | null>(null)
const burndown = ref<BurndownReport | null>(null)
const loading = ref(false)

const burndownChartData = computed(() => {
  if (!burndown.value || burndown.value.points.length === 0) return null
  const pts = burndown.value.points
  return {
    labels: pts.map(p => p.date),
    datasets: [
      {
        label: t('reports.remaining'),
        data: pts.map(p => p.remaining),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59,130,246,0.1)',
        fill: true,
        tension: 0.2,
      },
      {
        label: t('reports.ideal'),
        data: pts.map(p => p.ideal),
        borderColor: '#94a3b8',
        borderDash: [6, 3],
        pointRadius: 0,
        fill: false,
      },
    ],
  }
})

function prioritySeverity(p: string): 'danger' | 'warning' | 'info' | 'secondary' {
  if (p === 'highest' || p === 'high') return 'danger'
  if (p === 'medium') return 'info'
  return 'secondary'
}

async function load() {
  loading.value = true
  try {
    const [r, b] = await Promise.all([
      getSprintReport(projectId, sprintId),
      getBurndownReport(sprintId),
    ])
    report.value = r
    burndown.value = b
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div>
    <div class="flex align-items-center justify-content-between mb-4">
      <div>
        <h2 class="m-0">{{ $t('reports.sprintReport') }}</h2>
        <div v-if="report" class="text-color-secondary text-sm mt-1">
          {{ report.sprint_name }}
          <Tag :value="report.status" :severity="report.status === 'completed' ? 'success' : 'info'" class="ml-2" />
        </div>
      </div>
      <Button icon="pi pi-refresh" text rounded @click="load" :loading="loading" />
    </div>

    <div v-if="loading && !report" class="flex justify-content-center p-6">
      <i class="pi pi-spin pi-spinner text-3xl text-color-secondary" />
    </div>

    <template v-else-if="report">
      <div class="grid mb-4">
        <div class="col-6 lg:col-3">
          <div class="surface-card p-4 border-round shadow-1 text-center">
            <div class="text-3xl font-bold text-primary">{{ report.summary.total_tickets }}</div>
            <div class="text-sm text-color-secondary mt-1">{{ $t('reports.totalTickets') }}</div>
          </div>
        </div>
        <div class="col-6 lg:col-3">
          <div class="surface-card p-4 border-round shadow-1 text-center">
            <div class="text-3xl font-bold" style="color: var(--p-green-500)">{{ report.summary.completed_tickets }}</div>
            <div class="text-sm text-color-secondary mt-1">{{ $t('reports.completed') }}</div>
          </div>
        </div>
        <div class="col-6 lg:col-3">
          <div class="surface-card p-4 border-round shadow-1 text-center">
            <div class="text-3xl font-bold" style="color: var(--p-orange-500)">{{ report.summary.incomplete_tickets }}</div>
            <div class="text-sm text-color-secondary mt-1">{{ $t('reports.incomplete') }}</div>
          </div>
        </div>
        <div class="col-6 lg:col-3">
          <div class="surface-card p-4 border-round shadow-1 text-center">
            <div class="text-3xl font-bold text-primary">{{ report.summary.completion_rate }}%</div>
            <div class="text-sm text-color-secondary mt-1">{{ $t('reports.completionRate') }}</div>
          </div>
        </div>
      </div>

      <div class="grid mb-4">
        <div class="col-12 lg:col-6">
          <div class="surface-card p-4 border-round shadow-1">
            <div class="text-sm font-semibold text-color-secondary mb-3">{{ $t('reports.storyPoints') }}</div>
            <div class="flex gap-4">
              <div class="text-center">
                <div class="text-2xl font-bold text-primary">{{ report.summary.total_story_points }}</div>
                <div class="text-xs text-color-secondary">{{ $t('reports.planned') }}</div>
              </div>
              <div class="text-center">
                <div class="text-2xl font-bold" style="color: var(--p-green-500)">{{ report.summary.completed_story_points }}</div>
                <div class="text-xs text-color-secondary">{{ $t('reports.completed') }}</div>
              </div>
              <div class="text-center">
                <div class="text-2xl font-bold" style="color: var(--p-orange-500)">{{ report.summary.incomplete_story_points }}</div>
                <div class="text-xs text-color-secondary">{{ $t('reports.carryOver') }}</div>
              </div>
            </div>
          </div>
        </div>
        <div class="col-12 lg:col-6">
          <div class="surface-card p-4 border-round shadow-1">
            <div class="text-sm font-semibold text-color-secondary mb-3">{{ $t('reports.burndown') }}</div>
            <div v-if="!burndownChartData" class="text-color-secondary text-sm">{{ $t('reports.noData') }}</div>
            <div v-else style="height: 200px">
              <LineChart :data="burndownChartData" />
            </div>
          </div>
        </div>
      </div>

      <div class="surface-card p-4 border-round shadow-1">
        <div class="text-sm font-semibold text-color-secondary mb-3">{{ $t('reports.sprintTickets') }}</div>
        <DataTable :value="report.tickets" data-key="ticket_id" striped-rows class="p-datatable-sm">
          <Column field="ticket_key" :header="$t('projects.key')" style="width: 6rem">
            <template #body="{ data }">
              <span class="font-mono text-sm">{{ data.ticket_key }}</span>
            </template>
          </Column>
          <Column field="title" :header="$t('tickets.title')" />
          <Column field="ticket_type" :header="$t('tickets.type')" style="width: 7rem">
            <template #body="{ data }">
              <Tag :value="data.ticket_type" severity="secondary" />
            </template>
          </Column>
          <Column field="priority" :header="$t('tickets.priority')" style="width: 7rem">
            <template #body="{ data }">
              <Tag :value="data.priority" :severity="prioritySeverity(data.priority)" />
            </template>
          </Column>
          <Column field="story_points" :header="$t('tickets.storyPoints')" style="width: 6rem" />
          <Column field="completed" :header="$t('common.status')" style="width: 7rem">
            <template #body="{ data }">
              <Tag :value="data.completed ? $t('reports.completed') : $t('reports.incomplete')" :severity="data.completed ? 'success' : 'warning'" />
            </template>
          </Column>
        </DataTable>
      </div>
    </template>
  </div>
</template>
