<script setup lang="ts">
import { computed } from 'vue'
import type { Ticket } from '@/api/tickets'
import TicketInlinePicker from '@/components/tickets/TicketInlinePicker.vue'

const props = defineProps<{
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
  cancel: []
}>()

const displayAssigneeId = computed(() =>
  props.editing ? (editValue.value ?? props.ticket.assignee_id) : props.ticket.assignee_id,
)
</script>

<template>
  <TicketInlinePicker
    :editing="editing"
    v-model="editValue"
    :options="assigneeOptions"
    allow-clear
    @start="emit('start')"
    @commit="emit('commit')"
    @cancel="emit('cancel')"
  >
    <span
      class="inline-editable"
      :class="compact ? 'text-xs' : 'text-sm'"
    >
      {{ props.resolveAssigneeName(displayAssigneeId) }}
    </span>
  </TicketInlinePicker>
</template>

<style scoped>
.inline-editable {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: center;
  padding: 2px 6px;
  border-radius: 4px;
  transition: background 0.15s;
}

.inline-editable:hover {
  background: var(--p-surface-100, #f1f5f9);
}
</style>
