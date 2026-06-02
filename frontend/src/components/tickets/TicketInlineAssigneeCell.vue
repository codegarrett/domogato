<script setup lang="ts">
import Select from 'primevue/select'
import type { Ticket } from '@/api/tickets'

defineProps<{
  ticket: Ticket
  editing: boolean
  assigneeOptions: { label: string; value: string }[]
  resolveAssigneeName: (id: string | null) => string
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
      :options="assigneeOptions"
      option-label="label"
      option-value="value"
      :placeholder="$t('tickets.unassigned')"
      class="p-inputtext-sm w-full"
      show-clear
      @update:model-value="emit('commit')"
    />
  </div>
  <span
    v-else
    class="inline-editable"
    :class="compact ? 'text-xs inline-cell-root' : 'text-sm'"
    @click.stop="emit('start')"
  >
    {{ resolveAssigneeName(ticket.assignee_id) }}
  </span>
</template>

<style scoped>
.inline-cell-root {
  width: 100%;
  min-width: 0;
}

.inline-editable {
  display: block;
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: center;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  transition: background 0.15s;
}

.inline-editable:hover {
  background: var(--p-surface-100, #f1f5f9);
}
</style>
