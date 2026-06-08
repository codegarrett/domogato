<template>
  <Button
    v-tooltip.top="tooltip"
    icon="pi pi-sparkles"
    text
    rounded
    size="small"
    data-testid="ai-sparkles-button"
    :disabled="disabled || !chatStore.isConfigured || loading"
    :aria-label="t('contentAssist.aiGenerate')"
    @click="$emit('click')"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'

import { useChatStore } from '@/stores/chat'

defineProps<{
  loading?: boolean
  disabled?: boolean
}>()

defineEmits<{
  click: []
}>()

const { t } = useI18n()
const chatStore = useChatStore()

const tooltip = computed(() =>
  chatStore.isConfigured ? t('contentAssist.aiGenerate') : t('contentAssist.aiNotConfigured'),
)
</script>
