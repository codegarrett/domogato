<script setup lang="ts">
import { computed } from 'vue'
import Tag from 'primevue/tag'
import type { Ticket } from '@/api/tickets'
import TicketInlinePicker from '@/components/tickets/TicketInlinePicker.vue'

const props = defineProps<{
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
  cancel: []
}>()

const displayStatusId = computed(() =>
  props.editing && editValue.value ? editValue.value : props.ticket.workflow_status_id,
)
</script>

<template>
  <TicketInlinePicker
    :editing="editing"
    v-model="editValue"
    :options="statusOptions"
    @start="emit('start')"
    @commit="emit('commit')"
    @cancel="emit('cancel')"
  >
    <Tag
      :value="resolveStatusName(displayStatusId)"
      :style="resolveStatusStyle(displayStatusId)"
      class="inline-editable-tag"
      :class="{ 'text-xs': compact }"
    />
  </TicketInlinePicker>
</template>

<style scoped>
.inline-editable-tag {
  max-width: 100%;
  cursor: pointer;
}

.inline-editable-tag :deep(.p-tag-value) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}
</style>
