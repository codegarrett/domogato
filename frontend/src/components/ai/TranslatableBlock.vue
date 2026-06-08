<template>
  <div class="translatable-block">
    <slot
      v-if="$slots.default"
      :display-content="displayContent"
      :showing-translation="showingTranslation"
      :translating="translating"
      :has-content="hasContent"
      :has-translation="hasTranslation"
      :open-translate="openTranslate"
      :set-showing-translation="setShowingTranslation"
    />
    <template v-else>
      <div
        v-if="showActions"
        class="flex align-items-center gap-1"
        :class="actionsClass"
      >
        <slot name="label" />
        <TranslateActionButtons
          :showing-translation="showingTranslation"
          :translating="translating"
          :has-content="hasContent"
          :has-translation="hasTranslation"
          @translate="openTranslate"
          @update:showing-translation="setShowingTranslation"
        />
      </div>

      <RichContent
        v-if="format === 'markdown'"
        :content="displayContent"
        :empty-text="emptyText"
        :compact="compact"
      />
      <div
        v-else
        class="translatable-block-plain"
        :class="{ 'text-color-secondary': !displayContent, 'whitespace-pre-wrap': true }"
      >
        {{ displayContent || emptyText || '—' }}
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import TranslateActionButtons from '@/components/ai/TranslateActionButtons.vue'
import RichContent from '@/components/common/RichContent.vue'
import { useContentAssist } from '@/composables/useContentAssist'
import { useToastService } from '@/composables/useToast'
import type { ContentFormat } from '@/api/contentAssist'

const props = withDefaults(defineProps<{
  content: string
  format?: ContentFormat
  compact?: boolean
  emptyText?: string
  showActions?: boolean
  actionsClass?: string
}>(), {
  format: 'plain',
  compact: false,
  showActions: true,
  actionsClass: 'mb-1',
})

const { t } = useI18n()
const toast = useToastService()
const {
  translating,
  translateContent: runContentTranslate,
} = useContentAssist()

const showingTranslation = ref(false)
const activeTranslation = ref('')

const hasContent = computed(() => !!props.content.trim())
const hasTranslation = computed(() => !!activeTranslation.value)

const displayContent = computed(() =>
  showingTranslation.value && activeTranslation.value
    ? activeTranslation.value
    : props.content,
)

async function openTranslate() {
  if (!hasContent.value || translating.value || hasTranslation.value) return
  try {
    const { translated } = await runContentTranslate(props.content, props.format)
    activeTranslation.value = translated
    showingTranslation.value = true
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : t('common.error')
    toast.showError(t('common.error'), message)
  }
}

function setShowingTranslation(value: boolean) {
  showingTranslation.value = value
}

watch(() => props.content, () => {
  showingTranslation.value = false
  activeTranslation.value = ''
})
</script>
