<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Badge from 'primevue/badge'
import Button from 'primevue/button'
import OverlayPanel from 'primevue/overlaypanel'
import {
  listNotifications,
  getUnreadCount,
  markAsRead,
  markAllRead,
  type Notification,
} from '@/api/notifications'
import { useWebSocket } from '@/composables/useWebSocket'

const { t } = useI18n()
const router = useRouter()
const ws = useWebSocket()

const unreadCount = ref(0)
const notifications = ref<Notification[]>([])
const loading = ref(false)
const panelRef = ref()

let pollTimer: ReturnType<typeof setInterval> | null = null

async function loadUnreadCount() {
  try {
    unreadCount.value = await getUnreadCount()
  } catch { /* ignore */ }
}

async function loadNotifications() {
  loading.value = true
  try {
    const res = await listNotifications({ limit: 20 })
    notifications.value = res.items
  } finally {
    loading.value = false
  }
}

function togglePanel(event: Event) {
  panelRef.value?.toggle(event)
  if (!panelRef.value?.visible) {
    void loadNotifications()
  }
}

async function onClickNotification(n: Notification) {
  if (!n.is_read) {
    await markAsRead(n.id)
    n.is_read = true
    unreadCount.value = Math.max(0, unreadCount.value - 1)
  }
  panelRef.value?.hide()
  if (n.entity_type === 'ticket' && n.entity_id) {
    router.push(`/tickets/${n.entity_id}`)
  }
}

async function onMarkAllRead() {
  await markAllRead()
  unreadCount.value = 0
  notifications.value = notifications.value.map(n => ({ ...n, is_read: true }))
}

function onWsNotification(data: Record<string, unknown>) {
  unreadCount.value++
}

function formatTimeAgo(iso: string): string {
  const sec = Math.round((Date.now() - new Date(iso).getTime()) / 1000)
  if (sec < 60) return t('tickets.timeAgo.justNow')
  const min = Math.round(sec / 60)
  if (min < 60) return t('tickets.timeAgo.minutesAgo', { n: min })
  const hr = Math.round(min / 60)
  if (hr < 24) return t('tickets.timeAgo.hoursAgo', { n: hr })
  const day = Math.round(hr / 24)
  return t('tickets.timeAgo.daysAgo', { n: day })
}

onMounted(() => {
  void loadUnreadCount()
  pollTimer = setInterval(loadUnreadCount, 60_000)
  ws.on('notification', onWsNotification)
})

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
  ws.off('notification', onWsNotification)
})
</script>

<template>
  <div class="notification-bell-wrapper">
    <div class="notification-bell" @click="togglePanel">
      <i class="pi pi-bell" />
      <Badge
        v-if="unreadCount > 0"
        :value="unreadCount > 99 ? '99+' : String(unreadCount)"
        severity="danger"
        class="notif-badge"
      />
    </div>

    <OverlayPanel ref="panelRef" :style="{ width: '22rem', maxWidth: '95vw' }">
      <div class="flex align-items-center justify-content-between mb-2 px-1">
        <span class="font-semibold text-sm">{{ $t('notifications.title') }}</span>
        <Button
          v-if="unreadCount > 0"
          :label="$t('notifications.markAllRead')"
          text
          size="small"
          class="p-0 text-xs"
          @click="onMarkAllRead"
        />
      </div>

      <div v-if="loading" class="flex justify-content-center p-3">
        <i class="pi pi-spin pi-spinner" />
      </div>

      <div v-else-if="notifications.length === 0" class="text-center text-color-secondary text-sm p-3">
        {{ $t('notifications.empty') }}
      </div>

      <div v-else class="notification-list">
        <div
          v-for="n in notifications"
          :key="n.id"
          class="notification-item"
          :class="{ unread: !n.is_read }"
          @click="onClickNotification(n)"
        >
          <div class="flex align-items-start gap-2">
            <div
              class="notif-dot"
              :class="{ visible: !n.is_read }"
            />
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium notif-title">{{ n.title }}</div>
              <div v-if="n.body" class="text-xs text-color-secondary mt-1 notif-body">{{ n.body }}</div>
              <div class="text-xs text-color-secondary mt-1">{{ formatTimeAgo(n.created_at) }}</div>
            </div>
          </div>
        </div>
      </div>
    </OverlayPanel>
  </div>
</template>

<style scoped>
.notification-bell-wrapper {
  position: relative;
  display: inline-flex;
}

.notification-bell {
  position: relative;
  cursor: pointer;
  font-size: 1.2rem;
  color: var(--p-text-muted-color);
  transition: color 0.15s;
}

.notification-bell:hover {
  color: var(--p-text-color);
}

.notif-badge {
  position: absolute;
  top: -6px;
  right: -8px;
  font-size: 0.6rem;
  min-width: 1.1rem;
  height: 1.1rem;
  line-height: 1.1rem;
}

.notification-list {
  max-height: 24rem;
  overflow-y: auto;
}

.notification-item {
  padding: 0.625rem 0.5rem;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.12s;
}

.notification-item:hover {
  background: var(--app-hover-bg);
}

.notification-item.unread {
  background: color-mix(in srgb, var(--p-primary-color) 5%, var(--p-content-background));
}

.notif-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  margin-top: 0.375rem;
  flex-shrink: 0;
  opacity: 0;
}

.notif-dot.visible {
  background: var(--p-primary-color);
  opacity: 1;
}

.notif-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.notif-body {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
