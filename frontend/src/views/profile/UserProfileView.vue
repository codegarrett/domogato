<template>
  <div class="profile-page">
    <h1 class="page-title">{{ t('profile.title') }}</h1>

    <div v-if="!user" class="flex justify-content-center py-6">
      <ProgressSpinner />
    </div>

    <div v-else class="profile-grid">
      <!-- Avatar & Identity -->
      <div class="profile-card">
        <h3 class="card-heading">{{ t('profile.avatar') }}</h3>
        <AvatarUpload
          :current-url="user.avatar_url"
          :initials="user.display_name?.charAt(0)?.toUpperCase() ?? '?'"
          @updated="onAvatarUpdated"
        />
      </div>

      <!-- Account Info -->
      <div class="profile-card">
        <h3 class="card-heading">{{ t('profile.accountInfo') }}</h3>
        <div class="info-grid">
          <div class="info-row">
            <label>{{ t('profile.displayName') }}</label>
            <div v-if="!editingName" class="info-value editable" @click="startEditName">
              {{ user.display_name }}
              <i class="pi pi-pencil edit-icon" />
            </div>
            <div v-else class="edit-row">
              <InputText v-model="editName" size="small" class="flex-1" @keyup.enter="saveName" />
              <Button icon="pi pi-check" size="small" text @click="saveName" :loading="savingName" />
              <Button icon="pi pi-times" size="small" text severity="secondary" @click="editingName = false" />
            </div>
          </div>
          <div class="info-row">
            <label>{{ t('common.email') }}</label>
            <div class="info-value">{{ user.email }}</div>
          </div>
          <div class="info-row">
            <label>{{ t('profile.memberSince') }}</label>
            <div class="info-value">{{ user.created_at ? formatDate(user.created_at) : '—' }}</div>
          </div>
          <div class="info-row">
            <label>{{ t('profile.lastLogin') }}</label>
            <div class="info-value">{{ user.last_login_at ? formatDate(user.last_login_at) : '—' }}</div>
          </div>
          <div class="info-row">
            <label>{{ t('common.role') }}</label>
            <div class="info-value">
              <Tag v-if="user.is_system_admin" value="System Admin" severity="warn" />
              <Tag v-else value="User" severity="info" />
            </div>
          </div>
        </div>
      </div>

      <!-- Security -->
      <div class="profile-card">
        <h3 class="card-heading">
          <i class="pi pi-shield" />
          {{ t('profile.security') }}
        </h3>
        <p class="text-sm text-color-secondary mb-3">{{ t('profile.securityDescription') }}</p>
        <div class="security-actions">
          <Button
            :label="t('profile.manageSecurity')"
            icon="pi pi-external-link"
            size="small"
            outlined
            @click="openKeycloak('security')"
          />
          <Button
            :label="t('profile.changePassword')"
            icon="pi pi-key"
            size="small"
            outlined
            @click="openKeycloak('password')"
          />
          <Button
            :label="t('profile.activeSessions')"
            icon="pi pi-desktop"
            size="small"
            outlined
            @click="openKeycloak('sessions')"
          />
        </div>
      </div>

      <!-- Notification Preferences -->
      <div class="profile-card">
        <h3 class="card-heading">
          <i class="pi pi-bell" />
          Notification Preferences
        </h3>
        <p class="text-sm text-color-secondary mb-3">Control how you receive notifications for each event type.</p>
        <div v-if="loadingPrefs" class="flex justify-content-center py-3">
          <i class="pi pi-spin pi-spinner" />
        </div>
        <div v-else class="notif-pref-table">
          <div class="notif-pref-header">
            <span class="notif-pref-event">Event</span>
            <span class="notif-pref-toggle">In-App</span>
            <span class="notif-pref-toggle">Email</span>
            <span class="notif-pref-delivery">Delivery</span>
          </div>
          <div v-for="pref in notifPrefs" :key="pref.event_category" class="notif-pref-row">
            <span class="notif-pref-event">{{ formatEventCategory(pref.event_category) }}</span>
            <span class="notif-pref-toggle">
              <input type="checkbox" v-model="pref.in_app" @change="savePrefs" />
            </span>
            <span class="notif-pref-toggle">
              <input type="checkbox" v-model="pref.email" @change="savePrefs" />
            </span>
            <span class="notif-pref-delivery">
              <select v-model="pref.email_delivery" @change="savePrefs" :disabled="!pref.email" class="pref-select">
                <option value="digest">Digest</option>
                <option value="instant">Instant</option>
              </select>
            </span>
          </div>
        </div>
      </div>

      <!-- Memberships -->
      <div class="profile-card">
        <h3 class="card-heading">{{ t('profile.memberships') }}</h3>
        <div v-if="user.org_memberships?.length" class="mb-3">
          <h4 class="sub-heading">{{ t('nav.organizations') }}</h4>
          <div class="membership-list">
            <div v-for="m in user.org_memberships" :key="m.id" class="membership-item">
              <router-link :to="`/organizations/${m.organization_id}`" class="membership-name">
                <i class="pi pi-building" />
                {{ m.organization_name }}
              </router-link>
              <Tag :value="m.role" :severity="roleSeverity(m.role)" size="small" />
            </div>
          </div>
        </div>
        <div v-if="user.project_memberships?.length">
          <h4 class="sub-heading">{{ t('nav.projects') }}</h4>
          <div class="membership-list">
            <div v-for="m in user.project_memberships" :key="m.id" class="membership-item">
              <router-link :to="`/projects/${m.project_id}`" class="membership-name">
                <i class="pi pi-folder" />
                {{ m.project_name }}
                <span class="membership-key">{{ m.project_key }}</span>
              </router-link>
              <Tag :value="m.role" :severity="roleSeverity(m.role)" size="small" />
            </div>
          </div>
        </div>
        <p v-if="!user.org_memberships?.length && !user.project_memberships?.length" class="text-sm text-color-secondary">
          {{ t('profile.noMemberships') }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import ProgressSpinner from 'primevue/progressspinner'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import AvatarUpload from '@/components/profile/AvatarUpload.vue'
import { useAuthStore } from '@/stores/auth'
import { updateCurrentUser, getAccountUrls, type AccountUrls } from '@/api/users'
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  type NotificationPref,
} from '@/api/notification-preferences'
import { useToastService } from '@/composables/useToast'

const { t } = useI18n()
const authStore = useAuthStore()
const toast = useToastService()

const user = ref(authStore.currentUser)
const editingName = ref(false)
const editName = ref('')
const savingName = ref(false)
const accountUrls = ref<AccountUrls | null>(null)

const notifPrefs = ref<NotificationPref[]>([])
const loadingPrefs = ref(true)
let prefsSaveTimer: ReturnType<typeof setTimeout> | null = null

const EVENT_LABELS: Record<string, string> = {
  ticket_assigned: 'Ticket Assigned',
  ticket_commented: 'Ticket Commented',
  ticket_status_changed: 'Status Changed',
  mentioned: 'Mentioned',
  sprint_started: 'Sprint Started',
  sprint_completed: 'Sprint Completed',
  kb_page_updated: 'KB Page Updated',
}

function formatEventCategory(cat: string): string {
  return EVENT_LABELS[cat] || cat.replace(/_/g, ' ')
}

async function loadPrefs() {
  loadingPrefs.value = true
  try {
    notifPrefs.value = await getNotificationPreferences()
  } catch {
    notifPrefs.value = []
  } finally {
    loadingPrefs.value = false
  }
}

function savePrefs() {
  if (prefsSaveTimer) clearTimeout(prefsSaveTimer)
  prefsSaveTimer = setTimeout(async () => {
    try {
      notifPrefs.value = await updateNotificationPreferences(notifPrefs.value)
    } catch { /* handled */ }
  }, 500)
}

onMounted(async () => {
  if (!user.value) {
    await authStore.fetchCurrentUser()
    user.value = authStore.currentUser
  }
  try {
    accountUrls.value = await getAccountUrls()
  } catch {
    // Keycloak URLs may not be available in dev mode
  }
  await loadPrefs()
})

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function roleSeverity(role: string) {
  const map: Record<string, string> = { owner: 'danger', admin: 'warn', maintainer: 'warn', developer: 'info', member: 'info', viewer: 'secondary', guest: 'secondary' }
  return (map[role] ?? 'secondary') as any
}

function startEditName() {
  editName.value = user.value?.display_name ?? ''
  editingName.value = true
}

async function saveName() {
  if (!editName.value.trim()) return
  savingName.value = true
  try {
    await updateCurrentUser({ display_name: editName.value.trim() })
    if (user.value) user.value.display_name = editName.value.trim()
    authStore.currentUser = { ...authStore.currentUser!, display_name: editName.value.trim() }
    editingName.value = false
    toast.showSuccess(t('common.success'), t('profile.nameUpdated'))
  } catch {
    toast.showError('Error', t('profile.updateFailed'))
  } finally {
    savingName.value = false
  }
}

function onAvatarUpdated(url: string | null) {
  if (user.value) user.value.avatar_url = url
  authStore.currentUser = { ...authStore.currentUser!, avatar_url: url }
}

function openKeycloak(section: 'security' | 'password' | 'sessions') {
  if (!accountUrls.value) {
    toast.showError('Error', t('profile.keycloakUnavailable'))
    return
  }
  const urlMap = {
    security: accountUrls.value.security_url,
    password: accountUrls.value.password_url,
    sessions: accountUrls.value.sessions_url,
  }
  window.open(urlMap[section], '_blank')
}
</script>

<style scoped>
.profile-page {
  max-width: 800px;
  margin: 0 auto;
}
.page-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0 0 1.5rem;
}
.profile-grid {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
.profile-card {
  background: var(--p-content-background);
  border: 1px solid var(--app-border-color);
  border-radius: 10px;
  padding: 1.5rem;
}
.card-heading {
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.sub-heading {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--p-text-muted-color);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin: 0 0 0.5rem;
}
.info-grid {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.info-row {
  display: flex;
  align-items: center;
  gap: 1rem;
}
.info-row label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--p-text-muted-color);
  width: 8rem;
  flex-shrink: 0;
}
.info-value {
  font-size: 0.875rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.info-value.editable {
  cursor: pointer;
  border-radius: 4px;
  padding: 0.25rem 0.5rem;
  margin: -0.25rem -0.5rem;
  transition: background 0.15s;
}
.info-value.editable:hover {
  background: var(--app-hover-bg);
}
.edit-icon {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
  opacity: 0;
  transition: opacity 0.15s;
}
.info-value.editable:hover .edit-icon {
  opacity: 1;
}
.edit-row {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}
.security-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.membership-list {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}
.membership-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  background: var(--app-card-alt-bg);
}
.membership-name {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--p-text-color);
  text-decoration: none;
  font-size: 0.875rem;
}
.membership-name:hover {
  color: var(--p-primary-color);
}
.membership-key {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
  font-weight: 600;
}
.notif-pref-table {
  display: flex;
  flex-direction: column;
  gap: 0;
}
.notif-pref-header,
.notif-pref-row {
  display: grid;
  grid-template-columns: 1fr 60px 60px 100px;
  align-items: center;
  padding: 0.5rem 0;
}
.notif-pref-header {
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--p-text-muted-color);
  border-bottom: 1px solid var(--p-content-border-color);
}
.notif-pref-row {
  border-bottom: 1px solid var(--p-surface-50);
  font-size: 0.8125rem;
}
.notif-pref-row:last-child {
  border-bottom: none;
}
.notif-pref-toggle {
  text-align: center;
}
.notif-pref-delivery {
  text-align: center;
}
.pref-select {
  font-size: 0.75rem;
  padding: 0.2rem 0.5rem;
  border: 1px solid var(--p-content-border-color);
  border-radius: 4px;
  background: var(--p-content-background);
  color: var(--p-text-color);
}
.pref-select:disabled {
  opacity: 0.5;
}
</style>
