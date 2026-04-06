<template>
  <div class="project-settings-page">
    <h1 class="page-title">{{ t('projects.settings') }}</h1>

    <div v-if="loading" class="flex justify-content-center p-4">
      <i class="pi pi-spin pi-spinner" style="font-size: 2rem;" />
    </div>

    <div v-else class="settings-list">
      <div class="settings-card">
        <div class="settings-row">
          <div>
            <div class="font-semibold">{{ t('projects.autoAddOrgMembers') }}</div>
            <p class="text-sm text-color-secondary mt-1 mb-0">{{ t('projects.autoAddOrgMembersDesc') }}</p>
          </div>
          <ToggleSwitch v-model="settings.auto_add_org_members" @change="onAutoAddToggle" />
        </div>
      </div>

      <!-- API Key Management -->
      <div class="settings-card">
        <div class="font-semibold mb-1">{{ t('projects.apiKey') }}</div>
        <p class="text-sm text-color-secondary mt-0 mb-3">{{ t('projects.apiKeyDesc') }}</p>

        <div v-if="settings.api_key" class="flex flex-column gap-3">
          <div class="api-key-display">
            <code class="flex-1 text-sm" style="word-break: break-all">{{ maskedKey }}</code>
            <Button
              :icon="showKey ? 'pi pi-eye-slash' : 'pi pi-eye'"
              text
              rounded
              size="small"
              :aria-label="showKey ? t('projects.hideKey') : t('projects.showKey')"
              @click="showKey = !showKey"
            />
            <Button
              icon="pi pi-copy"
              text
              rounded
              size="small"
              :aria-label="t('projects.copyKey')"
              @click="copyKey"
            />
          </div>
          <div class="flex gap-2">
            <Button
              :label="t('projects.regenerateKey')"
              icon="pi pi-refresh"
              severity="warn"
              size="small"
              :loading="generatingKey"
              @click="confirmRegenerate"
            />
            <Button
              :label="t('projects.revokeKey')"
              icon="pi pi-trash"
              severity="danger"
              text
              size="small"
              :loading="revokingKey"
              @click="confirmRevoke"
            />
          </div>
        </div>

        <div v-else>
          <Button
            :label="t('projects.generateKey')"
            icon="pi pi-key"
            size="small"
            :loading="generatingKey"
            @click="handleGenerateKey"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import ToggleSwitch from 'primevue/toggleswitch'
import {
  getProjectSettings,
  updateProjectSettings,
  generateProjectApiKey,
  revokeProjectApiKey,
  type ProjectSettings,
} from '@/api/projects'
import { useToastService } from '@/composables/useToast'

const { t } = useI18n()
const toast = useToastService()
const route = useRoute()
const projectId = route.params.projectId as string

const loading = ref(true)
const settings = ref<ProjectSettings>({ auto_add_org_members: false, api_key: null })
const showKey = ref(false)
const generatingKey = ref(false)
const revokingKey = ref(false)

const maskedKey = computed(() => {
  if (!settings.value.api_key) return ''
  if (showKey.value) return settings.value.api_key
  const key = settings.value.api_key
  return key.slice(0, 8) + '••••••••••••••••' + key.slice(-4)
})

onMounted(async () => {
  try {
    settings.value = await getProjectSettings(projectId)
  } finally {
    loading.value = false
  }
})

async function saveSettings() {
  try {
    settings.value = await updateProjectSettings(projectId, {
      auto_add_org_members: settings.value.auto_add_org_members,
    })
    toast.showSuccess(t('common.success'), t('projects.settingsSaved'))
  } catch {
    toast.showError(t('common.error'), t('projects.settingsSaveFailed'))
  }
}

async function onAutoAddToggle() {
  if (settings.value.auto_add_org_members) {
    if (!confirm(t('projects.confirmAutoAdd'))) {
      settings.value.auto_add_org_members = false
      return
    }
  }
  await saveSettings()
}

async function handleGenerateKey() {
  generatingKey.value = true
  try {
    settings.value = await generateProjectApiKey(projectId)
    showKey.value = true
    toast.showSuccess(t('common.success'), t('projects.apiKeyGenerated'))
  } catch {
    toast.showError(t('common.error'), t('projects.apiKeyFailed'))
  } finally {
    generatingKey.value = false
  }
}

function confirmRegenerate() {
  if (!confirm(t('projects.confirmRegenerateKey'))) return
  handleGenerateKey()
}

function confirmRevoke() {
  if (!confirm(t('projects.confirmRevokeKey'))) return
  handleRevokeKey()
}

async function handleRevokeKey() {
  revokingKey.value = true
  try {
    await revokeProjectApiKey(projectId)
    settings.value.api_key = null
    showKey.value = false
    toast.showSuccess(t('common.success'), t('projects.apiKeyRevoked'))
  } catch {
    toast.showError(t('common.error'), t('projects.apiKeyFailed'))
  } finally {
    revokingKey.value = false
  }
}

async function copyKey() {
  if (!settings.value.api_key) return
  try {
    await navigator.clipboard.writeText(settings.value.api_key)
    toast.showSuccess(t('common.success'), t('projects.apiKeyCopied'))
  } catch {
    toast.showError(t('common.error'), '')
  }
}
</script>

<style scoped>
.project-settings-page {
  max-width: 640px;
}
.page-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0 0 1.5rem;
}
.settings-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.settings-card {
  background: var(--p-content-background);
  border: 1px solid var(--app-border-color, var(--p-surface-200));
  border-radius: 10px;
  padding: 1.25rem 1.5rem;
}
.settings-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 2rem;
}
.api-key-display {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--p-surface-50);
  border: 1px solid var(--app-border-color, var(--p-surface-200));
  border-radius: 6px;
  padding: 0.5rem 0.75rem;
}
</style>
