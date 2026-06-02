<script setup lang="ts">
import Select from 'primevue/select'
import Tag from 'primevue/tag'
import type { Ticket } from '@/api/tickets'

defineProps<{
  ticket: Ticket
  editing: boolean
  statusOptions: { label: string; value: string }[]
  resolveStatusName: (id: string) => string
  resolveStatusStyle: (id: string) => Record<string, string>
  compact?: boolean
}>()

const editValue = defineModel<string | null>('editValue')

const emit = defineEmits<{
  start: []
  commit: []
}>()
</script>

<template>
  <div v-if="editing" class="inline-cell-root" @click.stop>
    <Select
      v-model="editValue"
      :options="statusOptions"
      option-label="label"
      option-value="value"
      class="p-inputtext-sm w-full"
      @update:model-value="emit('commit')"
    />
  </div>
  <Tag
    v-else
    :value="resolveStatusName(ticket.workflow_status_id)"
    :style="resolveStatusStyle(ticket.workflow_status_id)"
    class="cursor-pointer inline-editable-tag inline-cell-root"
    :class="{ 'text-xs': compact }"
    @click.stop="emit('start')"
  />
</template>

<style scoped>
.inline-cell-root {
  width: 100%;
  min-width: 0;
  max-width: 100%;
}

.inline-editable-tag {
  max-width: 100%;
  transition: opacity 0.15s, box-shadow 0.15s;
}

.inline-editable-tag:hover {
  opacity: 0.85;
  box-shadow: 0 0 0 2px var(--p-primary-200, #bfdbfe);
}

.inline-editable-tag :deep(.p-tag-value) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}
</style>
