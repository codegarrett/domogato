<template>
  <div class="markdown-editor">
    <div v-if="showPreview" class="markdown-editor-tabs flex gap-1 mb-2">
      <Button
        :label="$t('editor.write')"
        size="small"
        :severity="tab === 'write' ? 'primary' : 'secondary'"
        :text="tab !== 'write'"
        @click="tab = 'write'"
      />
      <Button
        :label="$t('editor.preview')"
        size="small"
        :severity="tab === 'preview' ? 'primary' : 'secondary'"
        :text="tab !== 'preview'"
        @click="tab = 'preview'"
      />
    </div>

    <Textarea
      v-if="!showPreview || tab === 'write'"
      :id="id"
      :model-value="modelValue"
      class="markdown-editor-input w-full"
      :rows="rows"
      :placeholder="placeholder"
      :auto-resize="autoResize"
      @update:model-value="emit('update:modelValue', $event ?? '')"
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
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import Textarea from 'primevue/textarea'
import RichContent from '@/components/common/RichContent.vue'

const { t } = useI18n()

const props = withDefaults(defineProps<{
  modelValue?: string
  placeholder?: string
  rows?: number
  autoResize?: boolean
  id?: string
  /** Show Write / Preview tabs (default on). */
  showPreview?: boolean
}>(), {
  modelValue: '',
  rows: 12,
  autoResize: true,
  showPreview: true,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const tab = ref<'write' | 'preview'>('write')

watch(
  () => props.modelValue,
  (value) => {
    if (!value?.trim()) tab.value = 'write'
  },
)

const previewEmptyText = computed(
  () => props.placeholder ?? t('editor.previewEmpty'),
)
</script>

<style scoped>
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
