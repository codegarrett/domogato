<template>
  <div v-if="isEmpty" class="rich-content-empty text-color-secondary text-sm">
    {{ emptyText }}
  </div>
  <!-- eslint-disable-next-line vue/no-v-html -->
  <div
    v-else
    class="prose"
    :class="{ 'prose--compact': compact }"
    v-html="renderedHtml"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { renderMarkdown } from '@/utils/richContent'

const props = withDefaults(defineProps<{
  content: string
  emptyText?: string
  compact?: boolean
}>(), {
  content: '',
  emptyText: '',
  compact: false,
})

const isEmpty = computed(() => !props.content?.trim())

const renderedHtml = computed(() => renderMarkdown(props.content))
</script>
