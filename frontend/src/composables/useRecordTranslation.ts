import { computed, ref, watch, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'

import type { ContentFormat } from '@/api/contentAssist'
import { useContentAssist } from '@/composables/useContentAssist'
import { useToastService } from '@/composables/useToast'

export function useRecordTranslation(
  titleSource: Ref<string>,
  descriptionSource: Ref<string>,
  descriptionFormat: ContentFormat,
) {
  const { t } = useI18n()
  const toast = useToastService()
  const { translating, translateContent } = useContentAssist()

  const showingTranslation = ref(false)
  const translatedTitle = ref('')
  const translatedDescription = ref('')

  const hasContent = computed(
    () => !!titleSource.value.trim() || !!descriptionSource.value.trim(),
  )

  const hasTranslation = computed(
    () => !!(translatedTitle.value || translatedDescription.value),
  )

  const displayTitle = computed(() => {
    if (showingTranslation.value && translatedTitle.value) {
      return translatedTitle.value
    }
    return titleSource.value
  })

  const displayDescription = computed(() => {
    if (showingTranslation.value && hasTranslation.value) {
      return translatedDescription.value || descriptionSource.value
    }
    return descriptionSource.value
  })

  async function fetchTranslations() {
    if (titleSource.value.trim()) {
      const { translated } = await translateContent(titleSource.value, 'plain')
      translatedTitle.value = translated
    }

    if (descriptionSource.value.trim()) {
      const { translated } = await translateContent(descriptionSource.value, descriptionFormat)
      translatedDescription.value = translated
    }
  }

  async function onTranslateClick() {
    if (!hasContent.value || translating.value) return
    if (hasTranslation.value) return

    try {
      await fetchTranslations()
      showingTranslation.value = true
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('common.error')
      toast.showError(t('common.error'), message)
    }
  }

  function setShowingTranslation(value: boolean) {
    showingTranslation.value = value
  }

  watch([titleSource, descriptionSource], () => {
    showingTranslation.value = false
    translatedTitle.value = ''
    translatedDescription.value = ''
  })

  return {
    showingTranslation,
    translating,
    hasContent,
    hasTranslation,
    displayTitle,
    displayDescription,
    onTranslateClick,
    setShowingTranslation,
  }
}
