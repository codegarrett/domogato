<template>
  <div class="admin-page">
    <div class="admin-header">
      <h1 class="page-title">{{ t('admin.authSettings') }}</h1>
      <AdminSubNav />
    </div>

    <div v-if="loading" class="flex justify-content-center py-6">
      <ProgressSpinner />
    </div>

    <div v-else class="auth-settings-content">
      <!-- Auth Mode Section -->
      <div class="settings-card">
        <div class="card-header">
          <h2>{{ t('admin.authMode') }}</h2>
          <p class="muted">{{ t('admin.authModeDescription') }}</p>
        </div>
        <div class="setting-row">
          <div class="setting-info">
            <label>{{ t('admin.authModeLabel') }}</label>
            <SourceBadge :source="settingSource('auth_mode')" :locked="settingLocked('auth_mode')" />
          </div>
          <Select
            v-model="form.auth_mode"
            :options="authModeOptions"
            option-label="label"
            option-value="value"
            :disabled="settingLocked('auth_mode')"
            class="setting-select"
          />
        </div>
      </div>

      <!-- Local Auth Section -->
      <div v-if="form.auth_mode === 'local'" class="settings-card">
        <div class="card-header">
          <h2>{{ t('admin.localAuthSettings') }}</h2>
          <p class="muted">{{ t('admin.localAuthDescription') }}</p>
        </div>
        <div class="setting-row">
          <div class="setting-info">
            <label>{{ t('admin.allowRegistration') }}</label>
            <SourceBadge :source="settingSource('local_registration_enabled')" :locked="settingLocked('local_registration_enabled')" />
          </div>
          <ToggleSwitch
            v-model="form.local_registration_enabled"
            :disabled="settingLocked('local_registration_enabled')"
          />
        </div>
      </div>

      <!-- OIDC Settings Section -->
      <div v-if="form.auth_mode === 'oidc'" class="settings-card">
        <div class="card-header">
          <h2>{{ t('admin.oidcSettings') }}</h2>
          <p class="muted">{{ t('admin.oidcDescription') }}</p>
        </div>
        <div class="setting-row vertical">
          <div class="setting-info">
            <label>{{ t('admin.oidcIssuerUrl') }}</label>
            <SourceBadge :source="settingSource('oidc_issuer_url')" :locked="settingLocked('oidc_issuer_url')" />
          </div>
          <InputText
            v-model="form.oidc_issuer_url"
            :disabled="settingLocked('oidc_issuer_url')"
            placeholder="https://keycloak.example.com/realms/projecthub"
            class="w-full"
          />
        </div>
        <div class="setting-row vertical">
          <div class="setting-info">
            <label>{{ t('admin.oidcClientId') }}</label>
            <SourceBadge :source="settingSource('oidc_client_id')" :locked="settingLocked('oidc_client_id')" />
          </div>
          <InputText
            v-model="form.oidc_client_id"
            :disabled="settingLocked('oidc_client_id')"
            placeholder="projecthub-backend"
            class="w-full"
          />
        </div>
        <div class="setting-row vertical">
          <div class="setting-info">
            <label>{{ t('admin.oidcClientSecret') }}</label>
            <SourceBadge :source="settingSource('oidc_client_secret')" :locked="settingLocked('oidc_client_secret')" />
          </div>
          <InputText
            v-model="form.oidc_client_secret"
            type="password"
            :disabled="settingLocked('oidc_client_secret')"
            placeholder="••••••••"
            class="w-full"
          />
        </div>
        <div class="setting-row">
          <div class="setting-info">
            <label>{{ t('admin.testConnection') }}</label>
          </div>
          <Button
            :label="testResult === null ? t('admin.testOidc') : testResult ? t('admin.testSuccess') : t('admin.testFailed')"
            :icon="testResult === null ? 'pi pi-bolt' : testResult ? 'pi pi-check' : 'pi pi-times'"
            :severity="testResult === null ? 'secondary' : testResult ? 'success' : 'danger'"
            size="small"
            :loading="testing"
            @click="testOidcConnection"
          />
        </div>
      </div>

      <!-- JIT Provisioning Section -->
      <div v-if="form.auth_mode === 'oidc'" class="settings-card">
        <div class="card-header">
          <h2>{{ t('admin.jitProvisioning') }}</h2>
          <p class="muted">{{ t('admin.jitDescription') }}</p>
        </div>
        <div class="setting-row">
          <div class="setting-info">
            <label>{{ t('admin.autoProvision') }}</label>
            <SourceBadge :source="settingSource('oidc_auto_provision')" :locked="settingLocked('oidc_auto_provision')" />
          </div>
          <ToggleSwitch
            v-model="form.oidc_auto_provision"
            :disabled="settingLocked('oidc_auto_provision')"
          />
        </div>
        <div class="setting-row vertical">
          <div class="setting-info">
            <label>{{ t('admin.allowedDomains') }}</label>
            <SourceBadge :source="settingSource('oidc_allowed_domains')" :locked="settingLocked('oidc_allowed_domains')" />
          </div>
          <div class="domain-input-wrapper">
            <div class="domain-tags">
              <Chip
                v-for="domain in form.oidc_allowed_domains"
                :key="domain"
                :label="domain"
                removable
                @remove="removeDomain(domain)"
              />
            </div>
            <div class="domain-add-row">
              <InputText
                v-model="newDomain"
                :placeholder="t('admin.addDomainPlaceholder')"
                size="small"
                :disabled="settingLocked('oidc_allowed_domains')"
                @keyup.enter="addDomain"
              />
              <Button
                icon="pi pi-plus"
                size="small"
                severity="secondary"
                :disabled="!newDomain.trim() || settingLocked('oidc_allowed_domains')"
                @click="addDomain"
              />
            </div>
          </div>
        </div>
        <div class="setting-row vertical">
          <div class="setting-info">
            <label>{{ t('admin.defaultOrg') }}</label>
            <SourceBadge :source="settingSource('oidc_default_org_id')" :locked="settingLocked('oidc_default_org_id')" />
          </div>
          <Select
            v-model="form.oidc_default_org_id"
            :options="orgOptions"
            option-label="label"
            option-value="value"
            :placeholder="t('admin.noDefaultOrg')"
            show-clear
            :disabled="settingLocked('oidc_default_org_id')"
            class="w-full"
          />
        </div>
        <div class="setting-row vertical">
          <div class="setting-info">
            <label>{{ t('admin.adminClaim') }}</label>
            <SourceBadge :source="settingSource('oidc_admin_claim')" :locked="settingLocked('oidc_admin_claim')" />
          </div>
          <InputText
            v-model="form.oidc_admin_claim"
            :disabled="settingLocked('oidc_admin_claim')"
            placeholder="projecthub-admin"
            class="w-full"
          />
        </div>
      </div>

      <!-- Save Button -->
      <div class="save-bar">
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
import { ref, reactive, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import ToggleSwitch from 'primevue/toggleswitch'
import Chip from 'primevue/chip'
import ProgressSpinner from 'primevue/progressspinner'
import AdminSubNav from '@/components/common/AdminSubNav.vue'
import SourceBadge from '@/components/admin/SourceBadge.vue'
import apiClient from '@/api/client'
import { useToastService } from '@/composables/useToast'

const { t } = useI18n()
const toast = useToastService()

const loading = ref(true)
const saving = ref(false)
const testing = ref(false)
const testResult = ref<boolean | null>(null)
const newDomain = ref('')

interface SettingEntry {
  value: any
  source: string
  env_locked: boolean
}

const serverSettings = ref<Record<string, SettingEntry>>({})

const form = reactive({
  auth_mode: 'local' as string,
  local_registration_enabled: false,
  oidc_issuer_url: '',
  oidc_client_id: '',
  oidc_client_secret: '',
  oidc_auto_provision: true,
  oidc_allowed_domains: [] as string[],
  oidc_default_org_id: null as string | null,
  oidc_admin_claim: 'projecthub-admin',
})

const authModeOptions = [
  { label: t('admin.modeLocal'), value: 'local' },
  { label: t('admin.modeOidc'), value: 'oidc' },
]

const orgOptions = ref<{ label: string; value: string }[]>([])

function settingSource(key: string): string {
  return serverSettings.value[key]?.source || 'default'
}

function settingLocked(key: string): boolean {
  return serverSettings.value[key]?.env_locked || false
}

function removeDomain(domain: string) {
  form.oidc_allowed_domains = form.oidc_allowed_domains.filter(d => d !== domain)
}

function addDomain() {
  const domain = newDomain.value.trim().toLowerCase()
  if (domain && !form.oidc_allowed_domains.includes(domain)) {
    form.oidc_allowed_domains.push(domain)
  }
  newDomain.value = ''
}

async function loadSettings() {
  loading.value = true
  try {
    const [settingsResp, orgsResp] = await Promise.all([
      apiClient.get('/system-settings/auth'),
      apiClient.get('/organizations'),
    ])
    serverSettings.value = settingsResp.data.settings

    for (const [key, entry] of Object.entries(settingsResp.data.settings) as [string, SettingEntry][]) {
      if (key in form) {
        (form as any)[key] = entry.value
      }
    }

    const orgs = orgsResp.data.items || orgsResp.data || []
    orgOptions.value = orgs.map((o: any) => ({ label: o.name, value: o.id }))
  } catch (e) {
    console.error('Failed to load auth settings:', e)
  } finally {
    loading.value = false
  }
}

async function saveSettings() {
  saving.value = true
  try {
    const updates: Record<string, any> = {}
    for (const [key, val] of Object.entries(form)) {
      if (!settingLocked(key)) {
        if (key === 'oidc_client_secret' && val === '****') continue
        updates[key] = val
      }
    }

    const resp = await apiClient.put('/system-settings/auth', updates)
    serverSettings.value = resp.data.settings
    toast.showSuccess(t('common.saved'), t('admin.settingsSaved'))
  } catch (e: any) {
    const msg = e.response?.data?.detail || 'Failed to save settings'
    toast.showError(t('common.error'), msg)
  } finally {
    saving.value = false
  }
}

async function testOidcConnection() {
  testing.value = true
  testResult.value = null
  try {
    const resp = await apiClient.post('/system-settings/auth/test-oidc', {
      issuer_url: form.oidc_issuer_url || undefined,
    })
    testResult.value = resp.data.success
    if (!resp.data.success) {
      toast.showError(t('admin.testFailed'), resp.data.detail || 'Unknown error')
    }
  } catch (e) {
    testResult.value = false
  } finally {
    testing.value = false
  }
}

onMounted(loadSettings)
</script>

<style scoped>
.admin-page {
  max-width: 900px;
  margin: 0 auto;
  padding: 1.5rem;
}
.admin-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}
.page-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
  color: var(--p-text-color);
}
.auth-settings-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}
.settings-card {
  background: var(--p-content-background);
  border-radius: 12px;
  border: 1px solid var(--app-border-color);
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.card-header h2 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--p-text-color);
}
.card-header .muted {
  margin: 0.25rem 0 0;
  font-size: 0.8125rem;
  color: var(--p-text-muted-color);
}
.setting-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 0;
  border-top: 1px solid var(--app-border-color);
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
.setting-info label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--p-text-color);
}
.setting-select {
  min-width: 160px;
}
.domain-input-wrapper {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.domain-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}
.domain-add-row {
  display: flex;
  gap: 0.5rem;
}
.domain-add-row .p-inputtext {
  flex: 1;
}
.save-bar {
  display: flex;
  justify-content: flex-end;
}
</style>
