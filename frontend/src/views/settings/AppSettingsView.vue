<template>
  <div class="settings-page">
    <h1 class="page-title">{{ t('settings.title') }}</h1>

    <div class="settings-grid">
      <!-- Language -->
      <div class="settings-card">
        <h3 class="card-heading">
          <i class="pi pi-globe" />
          {{ t('settings.language') }}
        </h3>
        <p class="text-sm text-color-secondary mb-3">{{ t('settings.languageDescription') }}</p>
        <Select
          v-model="locale"
          :options="localeOptions"
          option-label="label"
          option-value="value"
          class="w-full"
          style="max-width: 16rem;"
          @change="onLocaleChange"
        />
      </div>

      <!-- Appearance -->
      <div class="settings-card">
        <h3 class="card-heading">
          <i class="pi pi-palette" />
          {{ t('settings.appearance') }}
        </h3>
        <p class="text-sm text-color-secondary mb-3">{{ t('settings.appearanceDescription') }}</p>
        <div class="toggle-row">
          <label>{{ t('settings.darkMode') }}</label>
          <ToggleSwitch v-model="darkMode" @change="onDarkModeChange" />
        </div>
      </div>

      <!-- Notifications -->
      <div class="settings-card">
        <h3 class="card-heading">
          <i class="pi pi-bell" />
          {{ t('settings.notifications') }}
        </h3>
        <p class="text-sm text-color-secondary mb-3">{{ t('settings.notificationsDescription') }}</p>
        <div class="toggle-row">
          <label>{{ t('settings.emailNotifications') }}</label>
          <ToggleSwitch v-model="emailNotifications" @change="savePreferences" />
        </div>
        <div class="toggle-row mt-2">
          <label>{{ t('settings.soundNotifications') }}</label>
          <ToggleSwitch v-model="soundNotifications" @change="savePreferences" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import Select from 'primevue/select'
import ToggleSwitch from 'primevue/toggleswitch'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { updateCurrentUser } from '@/api/users'
import { setLocale, getLocale } from '@/i18n'
import { useToastService } from '@/composables/useToast'

const { t } = useI18n()
const authStore = useAuthStore()
const uiStore = useUiStore()
const toast = useToastService()

const localeOptions = [
  { label: 'English', value: 'en' },
  { label: 'Español', value: 'es' },
]

const locale = ref(getLocale() || 'en')
const darkMode = ref(uiStore.darkMode)
const emailNotifications = ref(true)
const soundNotifications = ref(true)

onMounted(() => {
  const prefs = authStore.currentUser?.preferences ?? {}
  if (prefs.locale) locale.value = prefs.locale as string
  if (typeof prefs.darkMode === 'boolean') {
    darkMode.value = prefs.darkMode
    uiStore.setDarkMode(darkMode.value)
  }
  const notifs = (prefs.notifications ?? {}) as Record<string, boolean>
  if (typeof notifs.email === 'boolean') emailNotifications.value = notifs.email
  if (typeof notifs.sound === 'boolean') soundNotifications.value = notifs.sound
})

async function onLocaleChange() {
  setLocale(locale.value as 'en' | 'es')
  await savePreferences()
}

async function onDarkModeChange() {
  uiStore.setDarkMode(darkMode.value)
  await savePreferences()
}

async function savePreferences() {
  try {
    const prefs = {
      locale: locale.value,
      darkMode: darkMode.value,
      notifications: {
        email: emailNotifications.value,
        sound: soundNotifications.value,
      },
    }
    await updateCurrentUser({ preferences: prefs })
    if (authStore.currentUser) {
      authStore.currentUser = { ...authStore.currentUser, preferences: prefs }
    }
  } catch {
    toast.showError('Error', t('settings.saveFailed'))
  }
}
</script>

<style scoped>
.settings-page {
  max-width: 600px;
  margin: 0 auto;
}
.page-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0 0 1.5rem;
}
.settings-grid {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
.settings-card {
  background: var(--p-content-background);
  border: 1px solid var(--app-border-color);
  border-radius: 10px;
  padding: 1.5rem;
}
.card-heading {
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0;
}
.toggle-row label {
  font-size: 0.875rem;
}
.mt-2 {
  margin-top: 0.5rem;
}
</style>
