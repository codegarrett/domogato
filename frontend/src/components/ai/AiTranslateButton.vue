<template>
  <Button
    v-tooltip.top="tooltip"
    icon="pi pi-language"
    text
    rounded
    size="small"
    data-testid="ai-translate-button"
    :loading="loading"
    :disabled="disabled || !chatStore.isConfigured || loading || !hasContent"
    :aria-label="t('contentAssist.aiTranslate')"
    @click="$emit('click')"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'

import { useChatStore } from '@/stores/chat'

const props = defineProps<{
  loading?: boolean
  disabled?: boolean
  hasContent?: boolean
}>()

defineEmits<{
  click: []
}>()

const { t } = useI18n()
const chatStore = useChatStore()

const tooltip = computed(() =>
  chatStore.isConfigured ? t('contentAssist.aiTranslate') : t('contentAssist.aiNotConfigured'),
)

const hasContent = computed(() => props.hasContent !== false)
</script>
