<template>
  <div class="admin-page">
    <div class="admin-header">
      <h1 class="page-title">{{ t('admin.embedSettings') }}</h1>
      <AdminSubNav />
    </div>

    <div v-if="loading" class="flex justify-content-center py-6">
      <ProgressSpinner />
    </div>

    <div v-else class="embed-settings-content">
      <div class="settings-card">
        <div class="card-header">
          <h2>{{ t('admin.externalAgent') }}</h2>
          <p class="muted">{{ t('admin.externalAgentDescription') }}</p>
        </div>
        <div class="setting-row">
          <div class="setting-info">
            <label>{{ t('admin.enableExternalAgent') }}</label>
            <SourceBadge
              :source="settingSource('external_agent_enabled')"
              :locked="settingLocked('external_agent_enabled')"
            />
          </div>
          <ToggleSwitch
            v-model="form.external_agent_enabled"
            :disabled="settingLocked('external_agent_enabled')"
          />
        </div>
      </div>

      <div class="settings-card">
        <div class="card-header">
          <h2>{{ t('admin.allowedOrigins') }}</h2>
          <p class="muted">{{ t('admin.allowedOriginsDescription') }}</p>
        </div>
        <div class="setting-row vertical">
          <div class="setting-info">
            <label>{{ t('admin.parentOrigins') }}</label>
            <SourceBadge
              :source="settingSource('external_agent_allowed_origins')"
              :locked="settingLocked('external_agent_allowed_origins')"
            />
          </div>
          <div class="origin-chips">
            <Chip
              v-for="origin in form.external_agent_allowed_origins"
              :key="origin"
              :label="origin"
              removable
              :disabled="settingLocked('external_agent_allowed_origins')"
              @remove="removeOrigin(origin)"
            />
          </div>
          <div class="origin-add">
            <InputText
              v-model="newOrigin"
              :placeholder="t('admin.addOriginPlaceholder')"
              class="flex-1"
              :disabled="settingLocked('external_agent_allowed_origins')"
              @keyup.enter="addOrigin"
            />
            <Button
              :label="t('common.add')"
              size="small"
              :disabled="settingLocked('external_agent_allowed_origins') || !newOrigin.trim()"
              @click="addOrigin"
            />
          </div>
          <p class="deploy-note">{{ t('admin.embedDeployNote') }}</p>
        </div>
      </div>

      <div v-if="form.external_agent_enabled" class="settings-card">
        <div class="card-header">
          <h2>{{ t('admin.embedSnippet') }}</h2>
          <p class="muted">{{ t('admin.embedSnippetDescription') }}</p>
        </div>
        <pre class="embed-snippet">{{ embedSnippet }}</pre>
      </div>

      <div class="settings-actions">
        <Button
          :label="t('common.save')"
          icon="pi pi-check"
          :loading="saving"
          @click="saveSettings"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import Chip from 'primevue/chip'
import InputText from 'primevue/inputtext'
import ProgressSpinner from 'primevue/progressspinner'
import ToggleSwitch from 'primevue/toggleswitch'
import AdminSubNav from '@/components/common/AdminSubNav.vue'
import SourceBadge from '@/components/admin/SourceBadge.vue'
import apiClient from '@/api/client'
import { useToastService } from '@/composables/useToast'

const { t } = useI18n()
const toast = useToastService()

const loading = ref(true)
const saving = ref(false)
const newOrigin = ref('')

interface SettingEntry {
  value: unknown
  source: string
  env_locked: boolean
}

const serverSettings = ref<Record<string, SettingEntry>>({})

const form = reactive({
  external_agent_enabled: false,
  external_agent_allowed_origins: [] as string[],
})

const embedSnippet = computed(() => {
  const origin = window.location.origin
  return `<iframe\n  src="${origin}/embed/agent"\n  title="ProjectHub AI Assistant"\n  width="420"\n  height="720"\n  style="border: none;"\n></iframe>`
})

function settingSource(key: string): string {
  return serverSettings.value[key]?.source || 'default'
}

function settingLocked(key: string): boolean {
  return serverSettings.value[key]?.env_locked || false
}

function removeOrigin(origin: string) {
  form.external_agent_allowed_origins = form.external_agent_allowed_origins.filter((o) => o !== origin)
}

function addOrigin() {
  const value = newOrigin.value.trim()
  if (value && !form.external_agent_allowed_origins.includes(value)) {
    form.external_agent_allowed_origins.push(value)
  }
  newOrigin.value = ''
}

async function loadSettings() {
  loading.value = true
  try {
    const resp = await apiClient.get('/system-settings/embed')
    serverSettings.value = resp.data.settings
    for (const [key, entry] of Object.entries(resp.data.settings) as [string, SettingEntry][]) {
      if (key in form) {
        ;(form as Record<string, unknown>)[key] = entry.value
      }
    }
  } catch (e) {
    console.error('Failed to load embed settings:', e)
  } finally {
    loading.value = false
  }
}

async function saveSettings() {
  saving.value = true
  try {
    const updates: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(form)) {
      if (!settingLocked(key)) {
        updates[key] = val
      }
    }
    const resp = await apiClient.put('/system-settings/embed', updates)
    serverSettings.value = resp.data.settings
    toast.showSuccess(t('common.saved'), t('admin.embedSettingsSaved'))
  } catch (e: unknown) {
    const err = e as { response?: { data?: { detail?: string } } }
    toast.showError(t('common.error'), err.response?.data?.detail || 'Failed to save settings')
  } finally {
    saving.value = false
  }
}

onMounted(loadSettings)
</script>

<style scoped>
.embed-settings-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-width: 720px;
}

.settings-card {
  background: var(--p-content-background);
  border: 1px solid var(--p-content-border-color);
  border-radius: var(--p-border-radius);
  padding: 1.25rem;
}

.card-header h2 {
  margin: 0 0 0.25rem;
  font-size: 1.125rem;
}

.muted {
  margin: 0;
  color: var(--p-text-muted-color);
  font-size: 0.875rem;
}

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-top: 1rem;
}

.setting-row.vertical {
  flex-direction: column;
  align-items: stretch;
}

.setting-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.origin-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.origin-add {
  display: flex;
  gap: 0.5rem;
}

.deploy-note {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--p-text-muted-color);
}

.embed-snippet {
  margin: 0;
  padding: 0.75rem;
  border-radius: 8px;
  background: var(--p-surface-ground, var(--p-surface-50));
  font-size: 0.8125rem;
  overflow-x: auto;
  white-space: pre-wrap;
}

.settings-actions {
  display: flex;
  justify-content: flex-end;
}
</style>
