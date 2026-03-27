<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import Card from 'primevue/card'
import Tag from 'primevue/tag'
import ProgressBar from 'primevue/progressbar'
import ProgressSpinner from 'primevue/progressspinner'
import { getDashboard, type DashboardData } from '@/api/dashboard'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const loading = ref(true)
const data = ref<DashboardData | null>(null)

async function load() {
  loading.value = true
  try {
    data.value = await getDashboard()
  } catch {
    data.value = null
  } finally {
    loading.value = false
  }
}

function prioritySeverity(p: string): 'danger' | 'warning' | 'info' | 'success' | 'secondary' {
  switch (p) {
    case 'highest': return 'danger'
    case 'high': return 'warning'
    case 'medium': return 'info'
    case 'low': return 'success'
    default: return 'secondary'
  }
}

function relativeTime(iso: string | null): string {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function formatDate(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

const greeting = computed(() => {
  const hour = new Date().getHours()
  const name = authStore.currentUser?.display_name?.split(' ')[0] || ''
  let greet = 'Good morning'
  if (hour >= 12 && hour < 17) greet = 'Good afternoon'
  else if (hour >= 17) greet = 'Good evening'
  return name ? `${greet}, ${name}` : greet
})

const overdueTickets = computed(() => {
  if (!data.value) return []
  const today = new Date().toISOString().slice(0, 10)
  return data.value.assigned_tickets.filter(
    (t) => t.due_date && t.due_date < today,
  )
})

onMounted(load)
</script>

<template>
  <div v-if="loading" class="flex justify-content-center py-6">
    <ProgressSpinner />
  </div>

  <div v-else-if="data" class="dashboard">
    <div class="dashboard-header">
      <h1 class="dashboard-greeting">{{ greeting }}</h1>
      <p class="dashboard-subtitle">Here's what needs your attention.</p>
    </div>

    <!-- Stats row -->
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-value">{{ data.stats.open_tickets }}</div>
        <div class="stat-label">Open Tickets</div>
      </div>
      <div class="stat-card" :class="{ 'stat-alert': data.overdue_count > 0 }">
        <div class="stat-value">{{ data.overdue_count }}</div>
        <div class="stat-label">Overdue</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ data.stats.completed_this_week }}</div>
        <div class="stat-label">Completed This Week</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ data.stats.hours_logged_this_week }}h</div>
        <div class="stat-label">Hours Logged</div>
      </div>
    </div>

    <!-- Overdue alert -->
    <div v-if="overdueTickets.length > 0" class="overdue-banner">
      <i class="pi pi-exclamation-triangle" />
      <span>{{ overdueTickets.length }} overdue ticket{{ overdueTickets.length !== 1 ? 's' : '' }} need attention</span>
    </div>

    <div class="dashboard-grid">
      <!-- My Tickets -->
      <Card class="dashboard-card card-tickets">
        <template #title>
          <div class="card-title-row">
            <span>My Tickets</span>
            <Tag :value="String(data.assigned_tickets.length)" severity="secondary" />
          </div>
        </template>
        <template #content>
          <div v-if="data.assigned_tickets.length === 0" class="empty-state">
            <i class="pi pi-check-circle" />
            <p>All clear! No tickets assigned.</p>
          </div>
          <div v-else class="ticket-list">
            <div
              v-for="ticket in data.assigned_tickets"
              :key="ticket.id"
              class="ticket-row"
              @click="router.push(`/tickets/${ticket.id}`)"
            >
              <div class="ticket-row-left">
                <Tag
                  :value="ticket.priority"
                  :severity="prioritySeverity(ticket.priority)"
                  class="ticket-priority-tag"
                />
                <span class="ticket-key">{{ ticket.ticket_key }}</span>
                <span class="ticket-title-text">{{ ticket.title }}</span>
              </div>
              <div class="ticket-row-right">
                <span class="ticket-status">{{ ticket.status_name }}</span>
                <span v-if="ticket.due_date" class="ticket-due" :class="{ overdue: ticket.due_date < new Date().toISOString().slice(0, 10) }">
                  {{ formatDate(ticket.due_date) }}
                </span>
              </div>
            </div>
          </div>
        </template>
      </Card>

      <!-- Right column -->
      <div class="dashboard-right">
        <!-- Active Sprints -->
        <Card v-if="data.active_sprints.length > 0" class="dashboard-card">
          <template #title>Active Sprints</template>
          <template #content>
            <div v-for="sprint in data.active_sprints" :key="sprint.id" class="sprint-row">
              <div class="sprint-info">
                <span class="sprint-name">{{ sprint.name }}</span>
                <span class="sprint-project">{{ sprint.project_name }}</span>
              </div>
              <div class="sprint-progress">
                <ProgressBar :value="sprint.progress_pct" :showValue="true" style="height: 8px;" />
                <span v-if="sprint.end_date" class="sprint-end">Ends {{ formatDate(sprint.end_date) }}</span>
              </div>
            </div>
          </template>
        </Card>

        <!-- Watching -->
        <Card v-if="data.watched_recent.length > 0" class="dashboard-card">
          <template #title>Watching</template>
          <template #content>
            <div
              v-for="w in data.watched_recent"
              :key="w.id"
              class="watched-row"
              @click="router.push(`/tickets/${w.id}`)"
            >
              <span class="ticket-key">{{ w.ticket_key }}</span>
              <span class="watched-title">{{ w.title }}</span>
              <span class="watched-time">{{ relativeTime(w.updated_at) }}</span>
            </div>
          </template>
        </Card>

        <!-- Recent Activity -->
        <Card v-if="data.recent_activity.length > 0" class="dashboard-card">
          <template #title>Recent Activity</template>
          <template #content>
            <div v-for="a in data.recent_activity" :key="a.id" class="activity-row">
              <i class="pi pi-circle-fill activity-dot" />
              <span class="activity-text">{{ a.title }}</span>
              <span class="activity-time">{{ relativeTime(a.created_at) }}</span>
            </div>
          </template>
        </Card>
      </div>
    </div>
  </div>

  <div v-else class="flex justify-content-center py-6 text-color-secondary">
    <p>Unable to load dashboard data.</p>
  </div>
</template>

<style scoped>
.dashboard {
  max-width: 1100px;
  margin: 0 auto;
}

.dashboard-header {
  margin-bottom: 1.5rem;
}

.dashboard-greeting {
  font-size: 1.75rem;
  font-weight: 700;
  margin: 0;
  letter-spacing: -0.02em;
}

.dashboard-subtitle {
  margin: 0.25rem 0 0;
  color: var(--p-text-muted-color);
  font-size: 0.9375rem;
}

/* Stats */
.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  margin-bottom: 1.25rem;
}

.stat-card {
  background: var(--p-content-background);
  border-radius: 10px;
  padding: 1.25rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  text-align: center;
}

.stat-card.stat-alert {
  border-left: 3px solid #ef4444;
}

.stat-value {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--p-text-color);
  line-height: 1.2;
}

.stat-label {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
  margin-top: 0.25rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

/* Overdue */
.overdue-banner {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  color: #dc2626;
  font-size: 0.875rem;
  font-weight: 600;
  margin-bottom: 1.25rem;
}

/* Grid */
.dashboard-grid {
  display: grid;
  grid-template-columns: 1.5fr 1fr;
  gap: 1.25rem;
  align-items: start;
}

.dashboard-right {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.dashboard-card {
  border-radius: 10px;
}

.dashboard-card :deep(.p-card-title) {
  font-size: 0.9375rem;
  font-weight: 700;
}

.card-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

/* Ticket list */
.ticket-list {
  display: flex;
  flex-direction: column;
}

.ticket-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--p-content-border-color);
  cursor: pointer;
  transition: background 0.12s;
  gap: 0.75rem;
}

.ticket-row:last-child {
  border-bottom: none;
}

.ticket-row:hover {
  background: var(--app-hover-bg);
  border-radius: 6px;
  padding-left: 0.5rem;
  padding-right: 0.5rem;
  margin: 0 -0.5rem;
}

.ticket-row-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
  flex: 1;
}

.ticket-priority-tag {
  font-size: 0.625rem;
  padding: 0.125rem 0.375rem;
}

.ticket-key {
  font-family: ui-monospace, monospace;
  font-size: 0.75rem;
  color: var(--p-primary-color);
  font-weight: 600;
  flex-shrink: 0;
}

.ticket-title-text {
  font-size: 0.8125rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ticket-row-right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-shrink: 0;
}

.ticket-status {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
}

.ticket-due {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
}

.ticket-due.overdue {
  color: #dc2626;
  font-weight: 600;
}

/* Empty */
.empty-state {
  text-align: center;
  padding: 2rem 1rem;
  color: var(--p-text-muted-color);
}

.empty-state i {
  font-size: 2rem;
  display: block;
  margin-bottom: 0.5rem;
  color: #22c55e;
}

/* Sprint */
.sprint-row {
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--p-content-border-color);
}

.sprint-row:last-child {
  border-bottom: none;
}

.sprint-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.375rem;
}

.sprint-name {
  font-size: 0.8125rem;
  font-weight: 600;
}

.sprint-project {
  font-size: 0.6875rem;
  color: var(--p-text-muted-color);
}

.sprint-progress :deep(.p-progressbar) {
  border-radius: 4px;
}

.sprint-end {
  font-size: 0.6875rem;
  color: var(--p-text-muted-color);
  margin-top: 0.25rem;
  display: block;
}

/* Watched */
.watched-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0;
  cursor: pointer;
  font-size: 0.8125rem;
  border-bottom: 1px solid var(--p-content-border-color);
}

.watched-row:last-child {
  border-bottom: none;
}

.watched-row:hover {
  color: var(--p-primary-color);
}

.watched-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.watched-time {
  font-size: 0.6875rem;
  color: var(--p-text-muted-color);
  flex-shrink: 0;
}

/* Activity */
.activity-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0;
  font-size: 0.8125rem;
}

.activity-dot {
  font-size: 0.375rem;
  color: var(--p-primary-color);
  flex-shrink: 0;
}

.activity-text {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.activity-time {
  font-size: 0.6875rem;
  color: var(--p-text-muted-color);
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .stats-row {
    grid-template-columns: repeat(2, 1fr);
  }
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
}
</style>
