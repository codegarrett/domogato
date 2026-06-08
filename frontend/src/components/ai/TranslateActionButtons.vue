<template>
  <AiTranslateButton
    :loading="translating"
    :has-content="hasContent"
    @click="$emit('translate')"
  />
  <InputSwitch
    v-if="hasTranslation"
    :model-value="showingTranslation"
    class="translate-view-toggle"
    v-tooltip.top="toggleTooltip"
    :aria-label="toggleTooltip"
    @update:model-value="$emit('update:showingTranslation', $event)"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import InputSwitch from 'primevue/inputswitch'

import AiTranslateButton from '@/components/ai/AiTranslateButton.vue'

const props = defineProps<{
  showingTranslation: boolean
  translating: boolean
  hasContent: boolean
  hasTranslation: boolean
}>()

defineEmits<{
  translate: []
  'update:showingTranslation': [value: boolean]
}>()

const { t } = useI18n()

const toggleTooltip = computed(() =>
  props.showingTranslation
    ? t('contentAssist.showingTranslation')
    : t('contentAssist.showOriginal'),
)
</script>

<style scoped>
.translate-view-toggle {
  transform: scale(0.85);
}
</style>
