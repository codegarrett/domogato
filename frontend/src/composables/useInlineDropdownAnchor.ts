import {
  ref,
  watch,
  nextTick,
  onBeforeUnmount,
  type CSSProperties,
  type Ref,
} from 'vue'

const ARROW_SIZE_PX = 7
/** Space between focus ring and caret tip. */
const TIP_CLEARANCE_PX = 4
const VIEWPORT_PAD_PX = 8

function focusRingExtent(el: HTMLElement): number {
  const cs = getComputedStyle(el)
  const width = parseFloat(cs.outlineWidth)
  const offset = parseFloat(cs.outlineOffset)
  return (Number.isNaN(width) ? 0 : width) + (Number.isNaN(offset) ? 0 : offset)
}

export type InlineDropdownPlacement = 'below' | 'above'

export function useInlineDropdownAnchor(options: {
  isActive: () => boolean
  panelVisible: Ref<boolean>
  onDismiss?: () => void
}) {
  const triggerRef = ref<HTMLElement | null>(null)
  const panelRef = ref<HTMLElement | null>(null)
  const panelStyle = ref<CSSProperties>({})
  const placement = ref<InlineDropdownPlacement>('below')
  let ignoreOutsideUntil = 0

  function updatePosition() {
    const trigger = triggerRef.value
    const panel = panelRef.value
    if (!trigger || !panel) return

    const tr = trigger.getBoundingClientRect()
    const pr = panel.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight

    const ring = focusRingExtent(trigger)
    const belowGap = ring + TIP_CLEARANCE_PX + ARROW_SIZE_PX
    const aboveGap = ring + TIP_CLEARANCE_PX + ARROW_SIZE_PX

    let left = tr.left + tr.width / 2 - pr.width / 2
    let top = tr.bottom + belowGap
    let place: InlineDropdownPlacement = 'below'

    if (top + pr.height > vh - VIEWPORT_PAD_PX) {
      top = tr.top - pr.height - aboveGap
      place = 'above'
    }

    left = Math.max(VIEWPORT_PAD_PX, Math.min(left, vw - pr.width - VIEWPORT_PAD_PX))

    const arrowOffset = tr.left + tr.width / 2 - left

    placement.value = place
    panelStyle.value = {
      position: 'fixed',
      top: `${Math.max(VIEWPORT_PAD_PX, top)}px`,
      left: `${left}px`,
      zIndex: 1100,
      '--inline-dropdown-arrow-x': `${arrowOffset}px`,
      '--inline-dropdown-arrow-size': `${ARROW_SIZE_PX}px`,
    }
  }

  function openPanel() {
    options.panelVisible.value = true
    ignoreOutsideUntil = performance.now() + 150
    void nextTick(() => {
      updatePosition()
      requestAnimationFrame(updatePosition)
    })
  }

  function closePanel() {
    if (options.panelVisible.value && options.isActive()) {
      options.onDismiss?.()
    }
    options.panelVisible.value = false
  }

  function onDocumentPointerDown(e: PointerEvent) {
    if (!options.panelVisible.value || performance.now() < ignoreOutsideUntil) return
    const target = e.target as Node
    if (triggerRef.value?.contains(target) || panelRef.value?.contains(target)) return
    closePanel()
  }

  function bindWindowListeners() {
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    document.addEventListener('pointerdown', onDocumentPointerDown, true)
  }

  function unbindWindowListeners() {
    window.removeEventListener('resize', updatePosition)
    window.removeEventListener('scroll', updatePosition, true)
    document.removeEventListener('pointerdown', onDocumentPointerDown, true)
  }

  watch(
    () => options.panelVisible.value,
    (visible) => {
      if (visible) {
        bindWindowListeners()
        void nextTick(updatePosition)
      } else {
        unbindWindowListeners()
      }
    },
  )

  onBeforeUnmount(unbindWindowListeners)

  return {
    triggerRef,
    panelRef,
    panelStyle,
    placement,
    openPanel,
    closePanel,
    updatePosition,
  }
}
