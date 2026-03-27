<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import DatePicker from 'primevue/datepicker'
import BarChart from '@/components/charts/BarChart.vue'
import PieChart from '@/components/charts/PieChart.vue'
import StackedAreaChart from '@/components/charts/StackedAreaChart.vue'
import ScatterChart from '@/components/charts/ScatterChart.vue'
import {
  getProjectSummary,
  getVelocityReport,
  getCycleTimeReport,
  getCumulativeFlowReport,
  type ProjectSummary,
  type VelocityReport,
  type CycleTimeReport,
  type CumulativeFlowReport,
} from '@/api/reports'

const route = useRoute()
const { t } = useI18n()
const projectId = route.params.projectId as string

const summary = ref<ProjectSummary | null>(null)
const velocity = ref<VelocityReport | null>(null)
const cycleTime = ref<CycleTimeReport | null>(null)
const cfd = ref<CumulativeFlowReport | null>(null)
const loading = ref(false)

const today = new Date()
const thirtyDaysAgo = new Date(today.getTime() - 30 * 86400000)
const cfdStartDate = ref<Date>(thirtyDaysAgo)
const cfdEndDate = ref<Date>(today)

function fmt(d: Date): string {
  return d.toISOString().slice(0, 10)
}

const completionPercent = computed(() => {
  if (!summary.value || summary.value.total_tickets === 0) return 0
  return Math.round((summary.value.done_tickets / summary.value.total_tickets) * 100)
})

const spPercent = computed(() => {
  if (!summary.value || summary.value.total_story_points === 0) return 0
  return Math.round((summary.value.completed_story_points / summary.value.total_story_points) * 100)
})

const PRIORITY_COLORS: Record<string, string> = {
  highest: '#ef4444', high: '#f97316', medium: '#3b82f6', low: '#22c55e', lowest: '#94a3b8',
}
const TYPE_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#14b8a6', '#64748b']

const priorityChartData = computed(() => {
  if (!summary.value) return { labels: [], datasets: [] }
  const entries = Object.entries(summary.value.by_priority)
  return {
    labels: entries.map(([k]) => k.charAt(0).toUpperCase() + k.slice(1)),
    datasets: [{
      data: entries.map(([, v]) => v),
      backgroundColor: entries.map(([k]) => PRIORITY_COLORS[k] || '#94a3b8'),
    }],
  }
})

const typeChartData = computed(() => {
  if (!summary.value) return { labels: [], datasets: [] }
  const entries = Object.entries(summary.value.by_type)
  return {
    labels: entries.map(([k]) => k.charAt(0).toUpperCase() + k.slice(1)),
    datasets: [{
      data: entries.map(([, v]) => v),
      backgroundColor: TYPE_COLORS.slice(0, entries.length),
    }],
  }
})

const velocityChartData = computed(() => {
  if (!velocity.value || velocity.value.entries.length === 0) return null
  const entries = velocity.value.entries
  return {
    labels: entries.map(e => e.sprint_name),
    datasets: [
      {
        label: t('reports.velocity'),
        data: entries.map(e => e.velocity),
        backgroundColor: 'rgba(99, 102, 241, 0.7)',
        borderRadius: 4,
      },
      {
        label: t('reports.averageVelocity'),
        data: entries.map(() => velocity.value!.average),
        type: 'line' as const,
        borderColor: '#f97316',
        borderDash: [6, 3],
        pointRadius: 0,
        borderWidth: 2,
        fill: false,
      },
    ],
  }
})

const cfdChartData = computed(() => {
  if (!cfd.value || cfd.value.days.length === 0) return null
  const days = cfd.value.days
  return {
    labels: days.map(d => d.date),
    datasets: [
      { label: 'Done', data: days.map(d => d.done), backgroundColor: 'rgba(34,197,94,0.5)', borderColor: '#22c55e', fill: true },
      { label: 'In Progress', data: days.map(d => d.in_progress), backgroundColor: 'rgba(59,130,246,0.5)', borderColor: '#3b82f6', fill: true },
      { label: 'To Do', data: days.map(d => d.todo), backgroundColor: 'rgba(148,163,184,0.5)', borderColor: '#94a3b8', fill: true },
    ],
  }
})

const cycleTimeChartData = computed(() => {
  if (!cycleTime.value || cycleTime.value.entries.length === 0) return null
  return {
    datasets: [{
      label: t('reports.cycleTime'),
      data: cycleTime.value.entries.map((e, i) => ({ x: i + 1, y: e.cycle_time_hours })),
      backgroundColor: 'rgba(99, 102, 241, 0.6)',
      pointRadius: 5,
    }],
  }
})

async function loadReports() {
  loading.value = true
  try {
    const [s, v, ct, flow] = await Promise.all([
      getProjectSummary(projectId),
      getVelocityReport(projectId),
      getCycleTimeReport(projectId),
      getCumulativeFlowReport(projectId, fmt(cfdStartDate.value), fmt(cfdEndDate.value)),
    ])
    summary.value = s
    velocity.value = v
    cycleTime.value = ct
    cfd.value = flow
  } finally {
    loading.value = false
  }
}

async function refreshCfd() {
  try {
    cfd.value = await getCumulativeFlowReport(projectId, fmt(cfdStartDate.value), fmt(cfdEndDate.value))
  } catch { /* noop */ }
}

onMounted(loadReports)
</script>

<template>
  <div>
    <div class="flex align-items-center justify-content-between mb-4">
      <h2 class="m-0">{{ $t('reports.title') }}</h2>
      <Button icon="pi pi-refresh" text rounded @click="loadReports" :loading="loading" />
    </div>

    <div v-if="loading && !summary" class="flex justify-content-center p-6">
      <i class="pi pi-spin pi-spinner text-3xl text-color-secondary" />
    </div>

    <template v-else-if="summary">
      <!-- Summary Cards -->
      <div class="grid mb-4">
        <div class="col-6 lg:col-3">
          <div class="surface-card p-4 border-round shadow-1 text-center">
            <div class="text-3xl font-bold text-primary">{{ summary.total_tickets }}</div>
            <div class="text-sm text-color-secondary mt-1">{{ $t('reports.totalTickets') }}</div>
          </div>
        </div>
        <div class="col-6 lg:col-3">
          <div class="surface-card p-4 border-round shadow-1 text-center">
            <div class="text-3xl font-bold" style="color: var(--p-green-500)">{{ summary.done_tickets }}</div>
            <div class="text-sm text-color-secondary mt-1">{{ $t('reports.completed') }}</div>
          </div>
        </div>
        <div class="col-6 lg:col-3">
          <div class="surface-card p-4 border-round shadow-1 text-center">
            <div class="text-3xl font-bold" style="color: var(--p-blue-500)">{{ summary.in_progress_tickets }}</div>
            <div class="text-sm text-color-secondary mt-1">{{ $t('reports.inProgress') }}</div>
          </div>
        </div>
        <div class="col-6 lg:col-3">
          <div class="surface-card p-4 border-round shadow-1 text-center">
            <div class="text-3xl font-bold" :style="{ color: summary.overdue_tickets > 0 ? 'var(--p-red-500)' : 'var(--p-text-color)' }">
              {{ summary.overdue_tickets }}
            </div>
            <div class="text-sm text-color-secondary mt-1">{{ $t('reports.overdue') }}</div>
          </div>
        </div>
      </div>

      <!-- Progress bars -->
      <div class="grid mb-4">
        <div class="col-12 lg:col-6">
          <div class="surface-card p-4 border-round shadow-1">
            <div class="text-sm font-semibold text-color-secondary mb-3">{{ $t('reports.ticketCompletion') }}</div>
            <div class="mb-2">
              <div class="h-1rem border-round overflow-hidden bg-surface-100">
                <div class="h-full border-round bg-primary" :style="{ width: completionPercent + '%' }" />
              </div>
            </div>
            <div class="text-sm text-color-secondary">{{ completionPercent }}% ({{ summary.done_tickets }}/{{ summary.total_tickets }})</div>
          </div>
        </div>
        <div class="col-12 lg:col-6">
          <div class="surface-card p-4 border-round shadow-1">
            <div class="text-sm font-semibold text-color-secondary mb-3">{{ $t('reports.storyPoints') }}</div>
            <div class="mb-2">
              <div class="h-1rem border-round overflow-hidden bg-surface-100">
                <div class="h-full border-round" :style="{ width: spPercent + '%', background: 'var(--p-green-500)' }" />
              </div>
            </div>
            <div class="text-sm text-color-secondary">{{ spPercent }}% ({{ summary.completed_story_points }}/{{ summary.total_story_points }})</div>
          </div>
        </div>
      </div>

      <!-- Pie Charts: Priority & Type -->
      <div class="grid mb-4">
        <div class="col-12 lg:col-6">
          <div class="surface-card p-4 border-round shadow-1">
            <div class="text-sm font-semibold text-color-secondary mb-3">{{ $t('reports.byPriority') }}</div>
            <div v-if="Object.keys(summary.by_priority).length === 0" class="text-color-secondary text-sm">{{ $t('reports.noData') }}</div>
            <div v-else style="height: 240px">
              <PieChart :data="priorityChartData" />
            </div>
          </div>
        </div>
        <div class="col-12 lg:col-6">
          <div class="surface-card p-4 border-round shadow-1">
            <div class="text-sm font-semibold text-color-secondary mb-3">{{ $t('reports.byType') }}</div>
            <div v-if="Object.keys(summary.by_type).length === 0" class="text-color-secondary text-sm">{{ $t('reports.noData') }}</div>
            <div v-else style="height: 240px">
              <PieChart :data="typeChartData" />
            </div>
          </div>
        </div>
      </div>

      <!-- Velocity Bar Chart -->
      <div class="grid mb-4">
        <div class="col-12">
          <div class="surface-card p-4 border-round shadow-1">
            <div class="text-sm font-semibold text-color-secondary mb-3">{{ $t('reports.velocity') }}</div>
            <div v-if="!velocityChartData" class="text-color-secondary text-sm">{{ $t('reports.noData') }}</div>
            <div v-else style="height: 300px">
              <BarChart :data="velocityChartData" />
            </div>
            <div v-if="velocity" class="text-sm text-color-secondary mt-2">
              {{ $t('reports.averageVelocity') }}: <strong>{{ velocity.average }} SP</strong>
            </div>
          </div>
        </div>
      </div>

      <!-- Cumulative Flow Stacked Area -->
      <div class="grid mb-4">
        <div class="col-12">
          <div class="surface-card p-4 border-round shadow-1">
            <div class="flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
              <div class="text-sm font-semibold text-color-secondary">{{ $t('reports.cumulativeFlow') }}</div>
              <div class="flex align-items-center gap-2">
                <DatePicker v-model="cfdStartDate" dateFormat="yy-mm-dd" showIcon class="w-10rem" @date-select="refreshCfd" />
                <span class="text-color-secondary">–</span>
                <DatePicker v-model="cfdEndDate" dateFormat="yy-mm-dd" showIcon class="w-10rem" @date-select="refreshCfd" />
              </div>
            </div>
            <div v-if="!cfdChartData" class="text-color-secondary text-sm">{{ $t('reports.noData') }}</div>
            <div v-else style="height: 300px">
              <StackedAreaChart :data="cfdChartData" />
            </div>
          </div>
        </div>
      </div>

      <!-- Cycle Time Scatter -->
      <div class="grid mb-4">
        <div class="col-12 lg:col-6">
          <div class="surface-card p-4 border-round shadow-1">
            <div class="text-sm font-semibold text-color-secondary mb-3">{{ $t('reports.cycleTime') }}</div>
            <div v-if="!cycleTimeChartData" class="text-color-secondary text-sm">{{ $t('reports.noData') }}</div>
            <div v-else style="height: 240px">
              <ScatterChart :data="cycleTimeChartData" :options="{ scales: { x: { title: { display: true, text: 'Ticket #' } }, y: { title: { display: true, text: 'Hours' }, beginAtZero: true } } }" />
            </div>
            <div v-if="cycleTime" class="flex gap-4 mt-3">
              <div class="text-center">
                <div class="text-xl font-bold text-primary">{{ cycleTime.average_hours }}h</div>
                <div class="text-xs text-color-secondary">{{ $t('reports.average') }}</div>
              </div>
              <div class="text-center">
                <div class="text-xl font-bold" style="color: var(--p-green-500)">{{ cycleTime.median_hours }}h</div>
                <div class="text-xs text-color-secondary">{{ $t('reports.median') }}</div>
              </div>
              <div class="text-center">
                <div class="text-xl font-bold text-color-secondary">{{ cycleTime.entries.length }}</div>
                <div class="text-xs text-color-secondary">{{ $t('reports.ticketsAnalyzed') }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
