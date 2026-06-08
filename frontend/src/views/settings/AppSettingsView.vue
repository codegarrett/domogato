<template>
  <div class="settings-page">
    <h1 class="page-title">{{ t('settings.title') }}</h1>

    <div class="settings-grid">
      <!-- Language -->
      <div class="settings-card">
        <h3 class="card-heading">
          <i class="pi pi-globe" aria-hidden="true" />
          {{ t('settings.language') }}
        </h3>
        <p class="text-sm text-color-secondary mb-3">{{ t('settings.languageDescription') }}</p>
        <label :for="localeId" class="sr-only">{{ t('settings.language') }}</label>
        <Select
          :id="localeId"
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
          <i class="pi pi-palette" aria-hidden="true" />
          {{ t('settings.appearance') }}
        </h3>
        <p class="text-sm text-color-secondary mb-3">{{ t('settings.appearanceDescription') }}</p>
        <div class="toggle-row">
          <label :for="darkModeId">{{ t('settings.darkMode') }}</label>
          <ToggleSwitch :id="darkModeId" v-model="darkMode" @change="onDarkModeChange" />
        </div>
      </div>

      <!-- Accessibility overrides -->
      <div
        v-if="showAccessibilityCard"
        class="settings-card"
      >
        <h3 class="card-heading">
          <i class="pi pi-eye" aria-hidden="true" />
          {{ t('settings.accessibility') }}
        </h3>
        <p class="text-sm text-color-secondary mb-3">{{ t('settings.accessibilityDescription') }}</p>
        <div v-if="a11yStore.allowUserMotionOverride" class="toggle-row">
          <div>
            <label :for="reducedMotionId">{{ t('settings.reducedMotion') }}</label>
            <p class="text-xs text-color-secondary m-0">{{ t('settings.reducedMotionDescription') }}</p>
          </div>
          <ToggleSwitch :id="reducedMotionId" v-model="reducedMotion" @change="savePreferences" />
        </div>
        <div v-if="a11yStore.highContrastAvailable && a11yStore.allowUserContrastOverride" class="toggle-row mt-2">
          <div>
            <label :for="highContrastId">{{ t('settings.highContrast') }}</label>
            <p class="text-xs text-color-secondary m-0">{{ t('settings.highContrastDescription') }}</p>
          </div>
          <ToggleSwitch :id="highContrastId" v-model="highContrast" @change="onHighContrastChange" />
        </div>
        <div v-if="a11yStore.allowUserLiveRegionOverride" class="mt-3">
          <label :for="verbosityId" class="block text-sm mb-1">{{ t('settings.liveRegionVerbosity') }}</label>
          <p class="text-xs text-color-secondary mb-2">{{ t('settings.liveRegionVerbosityDescription') }}</p>
          <Select
            :id="verbosityId"
            v-model="liveRegionVerbosity"
            :options="verbosityOptions"
            option-label="label"
            option-value="value"
            class="w-full"
            style="max-width: 20rem;"
            @change="savePreferences"
          />
        </div>
      </div>

      <!-- Notifications -->
      <div class="settings-card">
        <h3 class="card-heading">
          <i class="pi pi-bell" aria-hidden="true" />
          {{ t('settings.notifications') }}
        </h3>
        <p class="text-sm text-color-secondary mb-3">{{ t('settings.notificationsDescription') }}</p>
        <div class="toggle-row">
          <label :for="emailNotifId">{{ t('settings.emailNotifications') }}</label>
          <ToggleSwitch :id="emailNotifId" v-model="emailNotifications" @change="savePreferences" />
        </div>
        <div class="toggle-row mt-2">
          <label :for="soundNotifId">{{ t('settings.soundNotifications') }}</label>
          <ToggleSwitch :id="soundNotifId" v-model="soundNotifications" @change="savePreferences" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, useId } from 'vue'
import { useI18n } from 'vue-i18n'
import Select from 'primevue/select'
import ToggleSwitch from 'primevue/toggleswitch'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { useAccessibilityStore, type LiveRegionVerbosity } from '@/stores/accessibility'
import { updateCurrentUser } from '@/api/users'
import { setLocale, getLocale } from '@/i18n'
import { useToastService } from '@/composables/useToast'

const { t } = useI18n()
const authStore = useAuthStore()
const uiStore = useUiStore()
const a11yStore = useAccessibilityStore()
const toast = useToastService()

const localeId = useId()
const darkModeId = useId()
const reducedMotionId = useId()
const highContrastId = useId()
const verbosityId = useId()
const emailNotifId = useId()
const soundNotifId = useId()

const localeOptions = [
  { label: 'English', value: 'en' },
  { label: 'Español', value: 'es' },
]

const verbosityOptions = computed(() => [
  { label: t('admin.a11yVerbosityOff'), value: 'off' },
  { label: t('admin.a11yVerbosityMinimal'), value: 'minimal' },
  { label: t('admin.a11yVerbosityStandard'), value: 'standard' },
  { label: t('admin.a11yVerbosityVerbose'), value: 'verbose' },
])

const locale = ref(getLocale() || 'en')
const darkMode = ref(uiStore.darkMode)
const emailNotifications = ref(true)
const soundNotifications = ref(true)
const reducedMotion = ref(false)
const highContrast = ref(false)
const liveRegionVerbosity = ref<LiveRegionVerbosity | null>(null)

const showAccessibilityCard = computed(
  () =>
    a11yStore.enabled &&
    (a11yStore.allowUserMotionOverride ||
      (a11yStore.highContrastAvailable && a11yStore.allowUserContrastOverride) ||
      a11yStore.allowUserLiveRegionOverride),
)

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

  const a11y = (prefs.accessibility ?? {}) as Record<string, unknown>
  if (typeof a11y.reducedMotion === 'boolean') reducedMotion.value = a11y.reducedMotion
  if (typeof a11y.highContrast === 'boolean') highContrast.value = a11y.highContrast
  if (typeof a11y.liveRegionVerbosity === 'string') {
    liveRegionVerbosity.value = a11y.liveRegionVerbosity as LiveRegionVerbosity
  }
})

async function onLocaleChange() {
  setLocale(locale.value as 'en' | 'es')
  await savePreferences()
}

async function onDarkModeChange() {
  uiStore.setDarkMode(darkMode.value)
  await savePreferences()
}

async function onHighContrastChange() {
  a11yStore.setUserPreferences({
    accessibility: {
      reducedMotion: a11yStore.allowUserMotionOverride ? reducedMotion.value : null,
      highContrast: highContrast.value,
      liveRegionVerbosity: liveRegionVerbosity.value,
    },
  })
  await savePreferences()
}

async function savePreferences() {
  try {
    const accessibility: Record<string, unknown> = {}
    if (a11yStore.allowUserMotionOverride) {
      accessibility.reducedMotion = reducedMotion.value
    }
    if (a11yStore.highContrastAvailable && a11yStore.allowUserContrastOverride) {
      accessibility.highContrast = highContrast.value
    }
    if (a11yStore.allowUserLiveRegionOverride && liveRegionVerbosity.value) {
      accessibility.liveRegionVerbosity = liveRegionVerbosity.value
    }

    const prefs: Record<string, unknown> = {
      locale: locale.value,
      darkMode: darkMode.value,
      notifications: {
        email: emailNotifications.value,
        sound: soundNotifications.value,
      },
    }
    if (Object.keys(accessibility).length > 0) {
      prefs.accessibility = accessibility
    }

    await updateCurrentUser({ preferences: prefs })
    if (authStore.currentUser) {
      authStore.currentUser = { ...authStore.currentUser, preferences: prefs }
    }
    a11yStore.setUserPreferences(prefs)
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
  gap: 1rem;
}
.toggle-row label {
  font-size: 0.875rem;
}
.mt-2 {
  margin-top: 0.5rem;
}
.mt-3 {
  margin-top: 0.75rem;
}
</style>
