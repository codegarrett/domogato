import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export type LiveRegionVerbosity = 'off' | 'minimal' | 'standard' | 'verbose'

export interface PlatformAccessibilityConfig {
  accessibility_enabled: boolean
  accessibility_compliance_target: string
  accessibility_skip_link_enabled: boolean
  accessibility_landmark_labels_enabled: boolean
  accessibility_keyboard_drag_alternatives: boolean
  accessibility_board_keyboard_nav: boolean
  accessibility_timeline_keyboard_nav: boolean
  accessibility_respect_reduced_motion: boolean
  accessibility_enhanced_focus_indicators: boolean
  accessibility_high_contrast_available: boolean
  accessibility_live_region_verbosity: LiveRegionVerbosity
  accessibility_chart_data_tables: boolean
  accessibility_allow_user_motion_override: boolean
  accessibility_allow_user_contrast_override: boolean
  accessibility_allow_user_live_region_override: boolean
  accessibility_ci_audit_level: string
}

export interface UserAccessibilityPrefs {
  reducedMotion: boolean | null
  highContrast: boolean | null
  liveRegionVerbosity: LiveRegionVerbosity | null
}

const PLATFORM_DEFAULTS: PlatformAccessibilityConfig = {
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
}

function parseUserPrefs(raw: unknown): UserAccessibilityPrefs {
  const prefs = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const verbosity = prefs.liveRegionVerbosity
  const validVerbosity = ['off', 'minimal', 'standard', 'verbose'] as const
  return {
    reducedMotion: typeof prefs.reducedMotion === 'boolean' ? prefs.reducedMotion : null,
    highContrast: typeof prefs.highContrast === 'boolean' ? prefs.highContrast : null,
    liveRegionVerbosity:
      typeof verbosity === 'string' && (validVerbosity as readonly string[]).includes(verbosity)
        ? (verbosity as LiveRegionVerbosity)
        : null,
  }
}

export const useAccessibilityStore = defineStore('accessibility', () => {
  const platform = ref<PlatformAccessibilityConfig>({ ...PLATFORM_DEFAULTS })
  const userPrefs = ref<UserAccessibilityPrefs>({
    reducedMotion: null,
    highContrast: null,
    liveRegionVerbosity: null,
  })
  const osPrefersReducedMotion = ref(false)

  const enabled = computed(() => platform.value.accessibility_enabled)

  const skipLinkEnabled = computed(
    () => enabled.value && platform.value.accessibility_skip_link_enabled,
  )

  const landmarkLabelsEnabled = computed(
    () => enabled.value && platform.value.accessibility_landmark_labels_enabled,
  )

  const keyboardDragAlternatives = computed(
    () => enabled.value && platform.value.accessibility_keyboard_drag_alternatives,
  )

  const boardKeyboardNav = computed(
    () => enabled.value && platform.value.accessibility_board_keyboard_nav,
  )

  const timelineKeyboardNav = computed(
    () => enabled.value && platform.value.accessibility_timeline_keyboard_nav,
  )

  const chartDataTables = computed(
    () => enabled.value && platform.value.accessibility_chart_data_tables,
  )

  const enhancedFocusIndicators = computed(
    () => enabled.value && platform.value.accessibility_enhanced_focus_indicators,
  )

  const highContrastAvailable = computed(
    () => enabled.value && platform.value.accessibility_high_contrast_available,
  )

  const allowUserMotionOverride = computed(
    () => platform.value.accessibility_allow_user_motion_override,
  )

  const allowUserContrastOverride = computed(
    () => platform.value.accessibility_allow_user_contrast_override,
  )

  const allowUserLiveRegionOverride = computed(
    () => platform.value.accessibility_allow_user_live_region_override,
  )

  const liveRegionVerbosity = computed<LiveRegionVerbosity>(() => {
    if (!enabled.value) return 'off'
    if (
      allowUserLiveRegionOverride.value &&
      userPrefs.value.liveRegionVerbosity !== null
    ) {
      return userPrefs.value.liveRegionVerbosity
    }
    return platform.value.accessibility_live_region_verbosity
  })

  const reducedMotion = computed(() => {
    if (!enabled.value || !platform.value.accessibility_respect_reduced_motion) {
      return false
    }
    if (allowUserMotionOverride.value && userPrefs.value.reducedMotion !== null) {
      return userPrefs.value.reducedMotion
    }
    return osPrefersReducedMotion.value
  })

  const highContrast = computed(() => {
    if (!highContrastAvailable.value) return false
    if (allowUserContrastOverride.value && userPrefs.value.highContrast !== null) {
      return userPrefs.value.highContrast
    }
    return false
  })

  function setPlatformConfig(config: Partial<PlatformAccessibilityConfig> | null | undefined) {
    if (!config) return
    platform.value = { ...PLATFORM_DEFAULTS, ...config }
  }

  function setUserPreferences(prefs: Record<string, unknown> | null | undefined) {
    const a11y = prefs?.accessibility
    userPrefs.value = parseUserPrefs(a11y)
    applyDocumentClasses()
  }

  function watchOsMotionPreference() {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    osPrefersReducedMotion.value = mq.matches
    const handler = (e: MediaQueryListEvent) => {
      osPrefersReducedMotion.value = e.matches
      applyDocumentClasses()
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }

  function applyDocumentClasses() {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    root.classList.toggle('a11y-reduced-motion', reducedMotion.value)
    root.classList.toggle('a11y-enhanced-focus', enhancedFocusIndicators.value)
    root.classList.toggle('a11y-high-contrast', highContrast.value)
  }

  function init() {
    const cleanup = watchOsMotionPreference()
    applyDocumentClasses()
    return cleanup
  }

  return {
    platform,
    userPrefs,
    enabled,
    skipLinkEnabled,
    landmarkLabelsEnabled,
    keyboardDragAlternatives,
    boardKeyboardNav,
    timelineKeyboardNav,
    chartDataTables,
    enhancedFocusIndicators,
    highContrastAvailable,
    allowUserMotionOverride,
    allowUserContrastOverride,
    allowUserLiveRegionOverride,
    liveRegionVerbosity,
    reducedMotion,
    highContrast,
    setPlatformConfig,
    setUserPreferences,
    applyDocumentClasses,
    init,
  }
})
