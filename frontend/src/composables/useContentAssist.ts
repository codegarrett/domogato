import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

import {
  generateContentAssist,
  translateContentAssist,
  type ContentAssistContext,
  type ContentAssistGenerateRequest,
  type ContentAssistGenerateResponse,
  type ContentFormat,
} from '@/api/contentAssist'
import { getLocale } from '@/i18n'
import {
  buildTranslationCacheKey,
  getCachedTranslation,
  hashText,
  setCachedTranslation,
} from '@/composables/useTranslationCache'

export function useContentAssist() {
  const { t } = useI18n()
  const generating = ref(false)
  const translating = ref(false)
  const generateError = ref<string | null>(null)
  const translateError = ref<string | null>(null)

  async function generateContent(
    request: Omit<ContentAssistGenerateRequest, 'prompt'> & { prompt: string },
  ): Promise<ContentAssistGenerateResponse> {
    generating.value = true
    generateError.value = null
    try {
      return await generateContentAssist(request)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('common.error')
      generateError.value = message
      throw err
    } finally {
      generating.value = false
    }
  }

  async function translateContent(
    text: string,
    contentFormat: ContentFormat,
    targetLocale?: 'en' | 'es',
  ): Promise<{ translated: string; fromCache: boolean }> {
    const locale = (targetLocale ?? getLocale()) as 'en' | 'es'
    const trimmed = text.trim()
    if (!trimmed) {
      throw new Error(t('contentAssist.translateEmpty'))
    }

    translating.value = true
    translateError.value = null
    try {
      const textHash = await hashText(trimmed)
      const cacheKey = buildTranslationCacheKey(locale, textHash)
      const cached = getCachedTranslation(cacheKey)
      if (cached !== null) {
        return { translated: cached, fromCache: true }
      }

      const result = await translateContentAssist({
        text: trimmed,
        target_locale: locale,
        content_format: contentFormat,
      })
      setCachedTranslation(cacheKey, result.translated_text)
      return { translated: result.translated_text, fromCache: false }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('common.error')
      translateError.value = message
      throw err
    } finally {
      translating.value = false
    }
  }

  return {
    generating,
    translating,
    generateError,
    translateError,
    generateContent,
    translateContent,
  }
}

export type { ContentAssistContext, ContentFormat, ContentAssistGenerateResponse }
