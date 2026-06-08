<template>
  <div class="markdown-editor">
    <div
      v-if="showPreview || label || $slots['label-append'] || $slots['header-actions']"
      class="markdown-editor-header flex align-items-center justify-content-between gap-2 mb-2"
    >
      <div class="flex align-items-center gap-1 min-w-0">
        <label v-if="label" :for="id" class="markdown-editor-label">{{ label }}</label>
        <slot name="label-append" />
      </div>
      <div class="flex align-items-center gap-2 flex-shrink-0">
        <slot name="header-actions" />
        <div v-if="showPreview" class="markdown-editor-preview-toggle flex align-items-center gap-2">
          <span class="text-sm text-color-secondary">{{ $t('editor.preview') }}</span>
          <InputSwitch v-model="previewing" :aria-label="$t('editor.preview')" />
        </div>
      </div>
    </div>

    <Textarea
      v-if="!showPreview || !previewing"
      :id="id"
      :model-value="modelValue"
      class="markdown-editor-input w-full"
      :rows="rows"
      :placeholder="placeholder"
      :auto-resize="autoResize"
      @update:model-value="emit('update:modelValue', $event ?? '')"
      @blur="emit('blur')"
    />
    <div v-else class="markdown-editor-preview surface-ground border-round p-3">
      <RichContent
        :content="modelValue"
        :empty-text="previewEmptyText"
        compact
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import InputSwitch from 'primevue/inputswitch'
import Textarea from 'primevue/textarea'
import RichContent from '@/components/common/RichContent.vue'

const { t } = useI18n()

const props = withDefaults(defineProps<{
  modelValue?: string
  placeholder?: string
  rows?: number
  autoResize?: boolean
  id?: string
  label?: string
  /** Show Preview toggle (default on). */
  showPreview?: boolean
}>(), {
  modelValue: '',
  rows: 12,
  autoResize: true,
  showPreview: true,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  blur: []
}>()

const previewing = ref(false)

const previewEmptyText = computed(
  () => props.placeholder ?? t('editor.previewEmpty'),
)
</script>

<style scoped>
.markdown-editor-label {
  font-size: 0.875rem;
  font-weight: 600;
  margin: 0;
}

.markdown-editor-preview-toggle :deep(.p-inputswitch) {
  transform: scale(0.85);
}

.markdown-editor-input {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 0.875rem;
  line-height: 1.6;
}

.markdown-editor-preview {
  min-height: 6rem;
  border: 1px solid var(--p-content-border-color, #dee2e6);
}

.markdown-editor-preview :deep(.prose),
.markdown-editor-preview :deep(.rich-content-empty) {
  min-height: 4rem;
}
</style>
