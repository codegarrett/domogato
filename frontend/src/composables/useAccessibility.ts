import { computed } from 'vue'
import { useAccessibilityStore, type LiveRegionVerbosity } from '@/stores/accessibility'

const VERBOSITY_RANK: Record<LiveRegionVerbosity, number> = {
  off: 0,
  minimal: 1,
  standard: 2,
  verbose: 3,
}

export function useAccessibility() {
  const store = useAccessibilityStore()

  const focusRingClass = computed(() =>
    store.enhancedFocusIndicators ? 'a11y-focus-enhanced' : 'a11y-focus-visible',
  )

  function shouldAnnounce(level: LiveRegionVerbosity): boolean {
    return VERBOSITY_RANK[store.liveRegionVerbosity] >= VERBOSITY_RANK[level]
  }

  function announce(message: string, level: LiveRegionVerbosity = 'minimal') {
    if (!shouldAnnounce(level) || typeof document === 'undefined') return
    const el = document.getElementById('a11y-live-region')
    if (!el) return
    el.textContent = ''
    window.requestAnimationFrame(() => {
      el.textContent = message
    })
  }

  return {
    store,
    focusRingClass,
    shouldAnnounce,
    announce,
    skipLinkEnabled: computed(() => store.skipLinkEnabled),
    landmarkLabelsEnabled: computed(() => store.landmarkLabelsEnabled),
    keyboardDragAlternatives: computed(() => store.keyboardDragAlternatives),
    boardKeyboardNav: computed(() => store.boardKeyboardNav),
    timelineKeyboardNav: computed(() => store.timelineKeyboardNav),
    chartDataTables: computed(() => store.chartDataTables),
    reducedMotion: computed(() => store.reducedMotion),
    highContrast: computed(() => store.highContrast),
    liveRegionVerbosity: computed(() => store.liveRegionVerbosity),
  }
}
