<template>
  <Textarea
    :model-value="modelValue"
    class="markdown-editor w-full"
    :rows="rows"
    :placeholder="placeholder"
    :auto-resize="autoResize"
    @update:model-value="emit('update:modelValue', $event ?? '')"
  />
</template>

<script setup lang="ts">
import Textarea from 'primevue/textarea'

withDefaults(defineProps<{
  modelValue?: string
  placeholder?: string
  rows?: number
  autoResize?: boolean
}>(), {
  modelValue: '',
  rows: 12,
  autoResize: true,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<style scoped>
.markdown-editor {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 0.875rem;
  line-height: 1.6;
}
</style>
