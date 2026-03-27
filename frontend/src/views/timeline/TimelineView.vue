<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import Select from 'primevue/select'
import { getTimeline, type TimelineData } from '@/api/timeline'

const route = useRoute()
const router = useRouter()
const projectId = route.params.projectId as string

const data = ref<TimelineData | null>(null)
const loading = ref(false)
const zoomLevel = ref<'day' | 'week' | 'month'>('week')

const zoomOptions = [
  { label: 'Day', value: 'day' as const },
  { label: 'Week', value: 'week' as const },
  { label: 'Month', value: 'month' as const },
]

function parseDate(s: string): Date {
  return new Date(s + 'T00:00:00')
}

const allItems = computed(() => {
  if (!data.value) return []
  const items: Array<{
    id: string
    label: string
    start: Date | null
    end: Date | null
    type: 'epic' | 'ticket'
    statusColor: string | null
    statusCategory: string
    priority: string
    epicId: string | null
  }> = []

  for (const e of data.value.epics) {
    items.push({
      id: e.id,
      label: e.title,
      start: e.start_date ? parseDate(e.start_date) : null,
      end: e.due_date ? parseDate(e.due_date) : null,
      type: 'epic',
      statusColor: '#3B82F6',
      statusCategory: 'epic',
      priority: '',
      epicId: null,
    })
  }

  for (const t of data.value.tickets) {
    items.push({
      id: t.id,
      label: `${t.ticket_key} ${t.title}`,
      start: t.start_date ? parseDate(t.start_date) : null,
      end: t.due_date ? parseDate(t.due_date) : null,
      type: 'ticket',
      statusColor: t.status_color,
      statusCategory: t.status_category,
      priority: t.priority,
      epicId: t.epic_id,
    })
  }

  return items
})

const timeRange = computed(() => {
  const starts: Date[] = []
  const ends: Date[] = []

  for (const item of allItems.value) {
    if (item.start) starts.push(item.start)
    if (item.end) ends.push(item.end)
  }

  if (starts.length === 0) {
    const now = new Date()
    return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: new Date(now.getFullYear(), now.getMonth() + 2, 0) }
  }

  const minStart = new Date(Math.min(...starts.map(d => d.getTime())))
  const maxEnd = new Date(Math.max(...ends.map(d => d.getTime())))
  minStart.setDate(minStart.getDate() - 7)
  maxEnd.setDate(maxEnd.getDate() + 7)
  return { start: minStart, end: maxEnd }
})

const totalDays = computed(() => {
  const { start, end } = timeRange.value
  return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))
})

const columnWidth = computed(() => {
  return zoomLevel.value === 'day' ? 40 : zoomLevel.value === 'week' ? 20 : 6
})

const headerDates = computed(() => {
  const dates: Array<{ label: string; width: number }> = []
  const { start, end } = timeRange.value
  const current = new Date(start)

  if (zoomLevel.value === 'month') {
    while (current <= end) {
      const label = current.toLocaleDateString('en', { month: 'short', year: '2-digit' })
      const daysInMonth = new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate()
      dates.push({ label, width: daysInMonth * columnWidth.value })
      current.setMonth(current.getMonth() + 1)
    }
  } else if (zoomLevel.value === 'week') {
    while (current <= end) {
      const label = current.toLocaleDateString('en', { month: 'short', day: 'numeric' })
      dates.push({ label, width: 7 * columnWidth.value })
      current.setDate(current.getDate() + 7)
    }
  } else {
    while (current <= end) {
      const label = current.toLocaleDateString('en', { weekday: 'narrow', day: 'numeric' })
      dates.push({ label, width: columnWidth.value })
      current.setDate(current.getDate() + 1)
    }
  }
  return dates
})

const chartWidth = computed(() => totalDays.value * columnWidth.value)

function getBarStyle(item: { start: Date | null; end: Date | null; type: string; statusColor: string | null; statusCategory: string }) {
  if (!item.start && !item.end) return null

  const rangeStart = timeRange.value.start.getTime()
  const itemStart = item.start ?? item.end!
  const itemEnd = item.end ?? item.start!
  const leftDays = (itemStart.getTime() - rangeStart) / (1000 * 60 * 60 * 24)
  const duration = Math.max(1, (itemEnd.getTime() - itemStart.getTime()) / (1000 * 60 * 60 * 24))

  let bg = item.statusColor || 'var(--p-primary-color)'
  if (item.type === 'epic') bg = '#3B82F6'
  else if (item.statusCategory === 'done') bg = 'var(--p-green-500)'
  else if (item.statusCategory === 'in_progress') bg = 'var(--p-blue-500)'
  else bg = 'var(--p-surface-300)'

  return {
    left: leftDays * columnWidth.value + 'px',
    width: duration * columnWidth.value + 'px',
    background: bg,
  }
}

const todayOffset = computed(() => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const days = (today.getTime() - timeRange.value.start.getTime()) / (1000 * 60 * 60 * 24)
  return days * columnWidth.value
})

function onClickItem(item: { id: string; type: string }) {
  if (item.type === 'ticket') {
    router.push(`/tickets/${item.id}`)
  }
}

async function loadTimeline() {
  loading.value = true
  try {
    data.value = await getTimeline(projectId)
  } finally {
    loading.value = false
  }
}

onMounted(loadTimeline)
</script>

<template>
  <div>
    <div class="flex align-items-center justify-content-between mb-4">
      <h2 class="m-0">{{ $t('timeline.title') }}</h2>
      <div class="flex gap-2 align-items-center">
        <Select v-model="zoomLevel" :options="zoomOptions" option-label="label" option-value="value" class="w-8rem" />
        <Button icon="pi pi-refresh" text rounded @click="loadTimeline" :loading="loading" />
      </div>
    </div>

    <div v-if="loading && !data" class="flex justify-content-center p-6">
      <i class="pi pi-spin pi-spinner text-3xl text-color-secondary" />
    </div>

    <template v-else-if="data">
      <div class="gantt-container surface-card border-round shadow-1">
        <div class="gantt-header" :style="{ width: (240 + chartWidth) + 'px' }">
          <div class="gantt-label-col">{{ $t('timeline.item') }}</div>
          <div class="gantt-timeline-header">
            <div
              v-for="(d, i) in headerDates"
              :key="i"
              class="gantt-header-cell"
              :style="{ width: d.width + 'px' }"
            >
              {{ d.label }}
            </div>
          </div>
        </div>

        <div class="gantt-body" :style="{ width: (240 + chartWidth) + 'px' }">
          <div
            v-for="item in allItems"
            :key="item.id"
            class="gantt-row"
            :class="{ epic: item.type === 'epic' }"
            @click="onClickItem(item)"
          >
            <div class="gantt-label-col">
              <span class="gantt-item-label" :class="{ 'font-bold': item.type === 'epic' }">
                {{ item.label }}
              </span>
            </div>
            <div class="gantt-chart-area" :style="{ width: chartWidth + 'px' }">
              <div
                v-if="todayOffset > 0 && todayOffset < chartWidth"
                class="gantt-today-line"
                :style="{ left: todayOffset + 'px' }"
              />
              <div
                v-if="getBarStyle(item)"
                class="gantt-bar"
                :class="{ 'gantt-bar-epic': item.type === 'epic' }"
                :style="getBarStyle(item)!"
              />
            </div>
          </div>

          <template v-if="data.unscheduled.length > 0">
            <div class="gantt-row gantt-divider">
              <div class="gantt-label-col text-color-secondary text-sm font-semibold">
                {{ $t('timeline.unscheduled') }} ({{ data.unscheduled.length }})
              </div>
              <div class="gantt-chart-area" :style="{ width: chartWidth + 'px' }" />
            </div>
            <div
              v-for="item in data.unscheduled"
              :key="item.id"
              class="gantt-row unscheduled"
              @click="router.push(`/tickets/${item.id}`)"
            >
              <div class="gantt-label-col">
                <span class="gantt-item-label text-color-secondary">{{ item.ticket_key }} {{ item.title }}</span>
              </div>
              <div class="gantt-chart-area" :style="{ width: chartWidth + 'px' }" />
            </div>
          </template>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.gantt-container {
  overflow-x: auto;
  overflow-y: auto;
  max-height: calc(100vh - 12rem);
}

.gantt-header {
  display: flex;
  position: sticky;
  top: 0;
  z-index: 2;
  background: var(--p-content-background);
  border-bottom: 2px solid var(--p-surface-200);
}

.gantt-label-col {
  width: 240px;
  min-width: 240px;
  padding: 0.5rem 0.75rem;
  font-size: 0.8125rem;
  position: sticky;
  left: 0;
  z-index: 1;
  background: var(--p-content-background);
  border-right: 1px solid var(--p-content-border-color);
}

.gantt-timeline-header {
  display: flex;
}

.gantt-header-cell {
  font-size: 0.6875rem;
  text-align: center;
  padding: 0.375rem 0;
  color: var(--p-text-muted-color);
  border-right: 1px solid var(--app-border-color);
  white-space: nowrap;
  overflow: hidden;
}

.gantt-body {
  position: relative;
}

.gantt-row {
  display: flex;
  border-bottom: 1px solid var(--app-border-color);
  cursor: pointer;
  transition: background 0.12s;
}

.gantt-row:hover {
  background: var(--app-hover-bg);
}

.gantt-row.epic {
  background: color-mix(in srgb, var(--p-primary-color) 5%, var(--p-content-background));
}

.gantt-row.gantt-divider {
  background: var(--app-card-alt-bg);
  cursor: default;
}

.gantt-row.unscheduled {
  opacity: 0.6;
}

.gantt-item-label {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.8125rem;
}

.gantt-chart-area {
  position: relative;
  height: 2rem;
  flex-shrink: 0;
}

.gantt-bar {
  position: absolute;
  top: 0.375rem;
  height: 1.25rem;
  border-radius: 4px;
  opacity: 0.85;
  transition: opacity 0.15s;
}

.gantt-bar:hover {
  opacity: 1;
}

.gantt-bar-epic {
  height: 0.75rem;
  top: 0.625rem;
  border-radius: 2px;
}

.gantt-today-line {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--p-red-400);
  z-index: 1;
  opacity: 0.5;
}
</style>
