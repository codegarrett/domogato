<template>
  <div class="admin-page">
    <div class="admin-header">
      <h1 class="page-title">{{ t('admin.accessibilitySettings') }}</h1>
      <AdminSubNav />
    </div>

    <div v-if="loading" class="flex justify-content-center py-6">
      <ProgressSpinner />
    </div>

    <div v-else class="a11y-settings-content">
      <div class="settings-card">
        <div class="card-header">
          <h2>{{ t('admin.a11yPolicy') }}</h2>
          <p class="muted">{{ t('admin.a11yPolicyDescription') }}</p>
        </div>
        <SettingToggle
          key-name="accessibility_enabled"
          :label="t('admin.a11yEnabled')"
          v-model="form.accessibility_enabled"
          :source="settingSource('accessibility_enabled')"
          :locked="settingLocked('accessibility_enabled')"
        />
        <div class="setting-row vertical mt-3">
          <label :for="complianceId">{{ t('admin.a11yComplianceTarget') }}</label>
          <Select
            :id="complianceId"
            v-model="form.accessibility_compliance_target"
            :options="complianceOptions"
            option-label="label"
            option-value="value"
            :disabled="settingLocked('accessibility_compliance_target')"
            class="w-full"
            style="max-width: 20rem;"
          />
          <SourceBadge
            :source="settingSource('accessibility_compliance_target')"
            :locked="settingLocked('accessibility_compliance_target')"
          />
        </div>
      </div>

      <div class="settings-card">
        <div class="card-header">
          <h2>{{ t('admin.a11yNavigation') }}</h2>
          <p class="muted">{{ t('admin.a11yNavigationDescription') }}</p>
        </div>
        <SettingToggle
          key-name="accessibility_skip_link_enabled"
          :label="t('admin.a11ySkipLink')"
          v-model="form.accessibility_skip_link_enabled"
          :source="settingSource('accessibility_skip_link_enabled')"
          :locked="settingLocked('accessibility_skip_link_enabled')"
        />
        <SettingToggle
          key-name="accessibility_landmark_labels_enabled"
          :label="t('admin.a11yLandmarkLabels')"
          v-model="form.accessibility_landmark_labels_enabled"
          :source="settingSource('accessibility_landmark_labels_enabled')"
          :locked="settingLocked('accessibility_landmark_labels_enabled')"
        />
      </div>

      <div class="settings-card">
        <div class="card-header">
          <h2>{{ t('admin.a11yInteraction') }}</h2>
          <p class="muted">{{ t('admin.a11yInteractionDescription') }}</p>
        </div>
        <SettingToggle
          key-name="accessibility_keyboard_drag_alternatives"
          :label="t('admin.a11yKeyboardDrag')"
          v-model="form.accessibility_keyboard_drag_alternatives"
          :source="settingSource('accessibility_keyboard_drag_alternatives')"
          :locked="settingLocked('accessibility_keyboard_drag_alternatives')"
        />
        <SettingToggle
          key-name="accessibility_board_keyboard_nav"
          :label="t('admin.a11yBoardKeyboardNav')"
          v-model="form.accessibility_board_keyboard_nav"
          :source="settingSource('accessibility_board_keyboard_nav')"
          :locked="settingLocked('accessibility_board_keyboard_nav')"
        />
        <SettingToggle
          key-name="accessibility_timeline_keyboard_nav"
          :label="t('admin.a11yTimelineKeyboardNav')"
          v-model="form.accessibility_timeline_keyboard_nav"
          :source="settingSource('accessibility_timeline_keyboard_nav')"
          :locked="settingLocked('accessibility_timeline_keyboard_nav')"
        />
      </div>

      <div class="settings-card">
        <div class="card-header">
          <h2>{{ t('admin.a11ySensory') }}</h2>
          <p class="muted">{{ t('admin.a11ySensoryDescription') }}</p>
        </div>
        <SettingToggle
          key-name="accessibility_respect_reduced_motion"
          :label="t('admin.a11yReducedMotion')"
          v-model="form.accessibility_respect_reduced_motion"
          :source="settingSource('accessibility_respect_reduced_motion')"
          :locked="settingLocked('accessibility_respect_reduced_motion')"
        />
        <SettingToggle
          key-name="accessibility_enhanced_focus_indicators"
          :label="t('admin.a11yEnhancedFocus')"
          v-model="form.accessibility_enhanced_focus_indicators"
          :source="settingSource('accessibility_enhanced_focus_indicators')"
          :locked="settingLocked('accessibility_enhanced_focus_indicators')"
        />
        <SettingToggle
          key-name="accessibility_high_contrast_available"
          :label="t('admin.a11yHighContrast')"
          v-model="form.accessibility_high_contrast_available"
          :source="settingSource('accessibility_high_contrast_available')"
          :locked="settingLocked('accessibility_high_contrast_available')"
        />
        <SettingToggle
          key-name="accessibility_chart_data_tables"
          :label="t('admin.a11yChartDataTables')"
          v-model="form.accessibility_chart_data_tables"
          :source="settingSource('accessibility_chart_data_tables')"
          :locked="settingLocked('accessibility_chart_data_tables')"
        />
        <div class="setting-row vertical mt-3">
          <label :for="verbosityId">{{ t('admin.a11yLiveRegionVerbosity') }}</label>
          <Select
            :id="verbosityId"
            v-model="form.accessibility_live_region_verbosity"
            :options="verbosityOptions"
            option-label="label"
            option-value="value"
            :disabled="settingLocked('accessibility_live_region_verbosity')"
            class="w-full"
            style="max-width: 20rem;"
          />
        </div>
      </div>

      <div class="settings-card">
        <div class="card-header">
          <h2>{{ t('admin.a11yUserOverrides') }}</h2>
          <p class="muted">{{ t('admin.a11yUserOverridesDescription') }}</p>
        </div>
        <SettingToggle
          key-name="accessibility_allow_user_motion_override"
          :label="t('admin.a11yAllowMotionOverride')"
          v-model="form.accessibility_allow_user_motion_override"
          :source="settingSource('accessibility_allow_user_motion_override')"
          :locked="settingLocked('accessibility_allow_user_motion_override')"
        />
        <SettingToggle
          key-name="accessibility_allow_user_contrast_override"
          :label="t('admin.a11yAllowContrastOverride')"
          v-model="form.accessibility_allow_user_contrast_override"
          :source="settingSource('accessibility_allow_user_contrast_override')"
          :locked="settingLocked('accessibility_allow_user_contrast_override')"
        />
        <SettingToggle
          key-name="accessibility_allow_user_live_region_override"
          :label="t('admin.a11yAllowLiveRegionOverride')"
          v-model="form.accessibility_allow_user_live_region_override"
          :source="settingSource('accessibility_allow_user_live_region_override')"
          :locked="settingLocked('accessibility_allow_user_live_region_override')"
        />
      </div>

      <div class="settings-card">
        <div class="card-header">
          <h2>{{ t('admin.a11yCi') }}</h2>
          <p class="muted">{{ t('admin.a11yCiDescription') }}</p>
        </div>
        <div class="setting-row vertical">
          <label :for="ciLevelId">{{ t('admin.a11yCiAuditLevel') }}</label>
          <Select
            :id="ciLevelId"
            v-model="form.accessibility_ci_audit_level"
            :options="ciLevelOptions"
            option-label="label"
            option-value="value"
            :disabled="settingLocked('accessibility_ci_audit_level')"
            class="w-full"
            style="max-width: 20rem;"
          />
        </div>
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
import { defineComponent, h, onMounted, reactive, ref, useId } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import ProgressSpinner from 'primevue/progressspinner'
import Select from 'primevue/select'
import ToggleSwitch from 'primevue/toggleswitch'
import AdminSubNav from '@/components/common/AdminSubNav.vue'
import SourceBadge from '@/components/admin/SourceBadge.vue'
import apiClient from '@/api/client'
import { useToastService } from '@/composables/useToast'

const { t } = useI18n()
const toast = useToastService()
const complianceId = useId()
const verbosityId = useId()
const ciLevelId = useId()

const SettingToggle = defineComponent({
  name: 'SettingToggle',
  props: {
    keyName: { type: String, required: true },
    label: { type: String, required: true },
    modelValue: { type: Boolean, required: true },
    source: { type: String, required: true },
    locked: { type: Boolean, default: false },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const inputId = useId()
    return () =>
      h('div', { class: 'setting-row' }, [
        h('div', { class: 'setting-info' }, [
          h('label', { for: inputId }, props.label),
          h(SourceBadge, { source: props.source, locked: props.locked }),
        ]),
        h(ToggleSwitch, {
          id: inputId,
          modelValue: props.modelValue,
          disabled: props.locked,
          'onUpdate:modelValue': (v: boolean) => emit('update:modelValue', v),
        }),
      ])
  },
})

const loading = ref(true)
const saving = ref(false)

interface SettingEntry {
  value: unknown
  source: string
  env_locked: boolean
}

const serverSettings = ref<Record<string, SettingEntry>>({})

const form = reactive({
  accessibility_enabled: true,
  accessibility_compliance_target: 'wcag_2_2_aa',
  accessibility_skip_link_enabled: true,
  accessibility_landmark_labels_enabled: true,
  accessibility_keyboard_drag_alternatives: false,
  accessibility_board_keyboard_nav: false,
  accessibility_timeline_keyboard_nav: false,
  accessibility_respect_reduced_motion: true,
  accessibility_enhanced_focus_indicators: false,
  accessibility_high_contrast_available: false,
  accessibility_live_region_verbosity: 'minimal',
  accessibility_chart_data_tables: false,
  accessibility_allow_user_motion_override: true,
  accessibility_allow_user_contrast_override: true,
  accessibility_allow_user_live_region_override: false,
  accessibility_ci_audit_level: 'warnings',
})

const complianceOptions = [
  { label: 'WCAG 2.2 Level AA', value: 'wcag_2_2_aa' },
]

const verbosityOptions = [
  { label: t('admin.a11yVerbosityOff'), value: 'off' },
  { label: t('admin.a11yVerbosityMinimal'), value: 'minimal' },
  { label: t('admin.a11yVerbosityStandard'), value: 'standard' },
  { label: t('admin.a11yVerbosityVerbose'), value: 'verbose' },
]

const ciLevelOptions = [
  { label: t('admin.a11yCiNone'), value: 'none' },
  { label: t('admin.a11yCiWarnings'), value: 'warnings' },
  { label: t('admin.a11yCiBlocking'), value: 'blocking' },
]

function settingSource(key: string): string {
  return serverSettings.value[key]?.source || 'default'
}

function settingLocked(key: string): boolean {
  return serverSettings.value[key]?.env_locked || false
}

async function loadSettings() {
  loading.value = true
  try {
    const resp = await apiClient.get('/system-settings/accessibility')
    serverSettings.value = resp.data.settings
    for (const [key, entry] of Object.entries(resp.data.settings) as [string, SettingEntry][]) {
      if (key in form) {
        ;(form as Record<string, unknown>)[key] = entry.value
      }
    }
  } catch (e) {
    console.error('Failed to load accessibility settings:', e)
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
    const resp = await apiClient.put('/system-settings/accessibility', updates)
    serverSettings.value = resp.data.settings
    toast.showSuccess(t('common.saved'), t('admin.a11ySettingsSaved'))
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
.a11y-settings-content {
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

.settings-actions {
  display: flex;
  justify-content: flex-end;
}
</style>
