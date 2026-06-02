<script setup lang="ts">
import { computed } from 'vue'
import Tag from 'primevue/tag'
import Select from 'primevue/select'
import InputNumber from 'primevue/inputnumber'
import TicketInlineAssigneeCell from '@/components/tickets/TicketInlineAssigneeCell.vue'
import TicketInlineStatusCell from '@/components/tickets/TicketInlineStatusCell.vue'
import type { Ticket } from '@/api/tickets'

const props = defineProps<{
  ticket: Ticket
  selected: boolean
  editingId: string | null
  editingField: string | null
  editValue: string | number | null
  typeOptions: { label: string; value: string }[]
  priorityOptions: { label: string; value: string }[]
  assigneeOptions: { label: string; value: string }[]
  statusOptions: { label: string; value: string }[]
  resolveAssigneeName: (id: string | null) => string
  resolveStatusName: (id: string) => string
  resolveStatusStyle: (id: string) => Record<string, string>
  formatLabel: (s: string) => string
  prioritySeverity: (p: string) => 'success' | 'info' | 'warn' | 'danger' | 'secondary'
  storyPointsModel: number | null
}>()

const emit = defineEmits<{
  toggleSelect: []
  startEdit: [field: string, value: string | number | null]
  commitEdit: []
  commitStatus: []
  cancelEdit: []
  'update:editValue': [value: string | number | null]
  'update:storyPointsModel': [value: number | null]
}>()

function isEditing(field: string): boolean {
  return props.editingId === props.ticket.id && props.editingField === field
}

const assigneeEditValue = computed({
  get: () => (props.editValue as string | null) ?? null,
  set: (v: string | null) => emit('update:editValue', v),
})

const statusEditValue = computed({
  get: () => (props.editValue as string | null) ?? null,
  set: (v: string | null) => emit('update:editValue', v),
})
</script>

<template>
  <div class="ticket-row flex align-items-center gap-2 px-3 py-2" :class="{ 'ticket-selected': selected }">
    <input type="checkbox" :checked="selected" class="mr-1" @click.stop="emit('toggleSelect')" />
    <i class="pi pi-bars text-color-secondary drag-handle" style="cursor: grab;" />
    <router-link :to="`/tickets/${ticket.id}`" class="no-underline flex align-items-center gap-2 flex-1 min-w-0" @click.stop>
      <Tag :value="ticket.ticket_key || `#${ticket.ticket_number}`" severity="info" class="text-xs flex-shrink-0" />
      <span class="font-medium text-primary hover:underline text-overflow-ellipsis overflow-hidden white-space-nowrap">{{ ticket.title }}</span>
    </router-link>
    <div class="flex align-items-center gap-2 flex-shrink-0">
      <div v-if="isEditing('ticket_type')" @click.stop>
        <Select
          :model-value="editValue as string"
          :options="typeOptions"
          option-label="label"
          option-value="value"
          class="p-inputtext-sm"
          style="width: 7rem;"
          @update:model-value="(v: string) => { emit('update:editValue', v); emit('commitEdit') }"
        />
      </div>
      <Tag
        v-else
        :value="formatLabel(ticket.ticket_type)"
        severity="secondary"
        class="text-xs cursor-pointer inline-editable-tag"
        @click.stop="emit('startEdit', 'ticket_type', ticket.ticket_type)"
      />

      <div v-if="isEditing('priority')" @click.stop>
        <Select
          :model-value="editValue as string"
          :options="priorityOptions"
          option-label="label"
          option-value="value"
          class="p-inputtext-sm"
          style="width: 7rem;"
          @update:model-value="(v: string) => { emit('update:editValue', v); emit('commitEdit') }"
        />
      </div>
      <Tag
        v-else
        :value="formatLabel(ticket.priority)"
        :severity="prioritySeverity(ticket.priority)"
        class="text-xs cursor-pointer inline-editable-tag"
        @click.stop="emit('startEdit', 'priority', ticket.priority)"
      />

      <TicketInlineAssigneeCell
        :ticket="ticket"
        :editing="isEditing('assignee_id')"
        v-model:edit-value="assigneeEditValue"
        :assignee-options="assigneeOptions"
        :resolve-assignee-name="resolveAssigneeName"
        compact
        @start="emit('startEdit', 'assignee_id', ticket.assignee_id)"
        @commit="emit('commitEdit')"
      />

      <TicketInlineStatusCell
        :ticket="ticket"
        :editing="isEditing('workflow_status_id')"
        v-model:edit-value="statusEditValue"
        :status-options="statusOptions"
        :resolve-status-name="resolveStatusName"
        :resolve-status-style="resolveStatusStyle"
        compact
        @start="emit('startEdit', 'workflow_status_id', ticket.workflow_status_id)"
        @commit="emit('commitStatus')"
      />

      <div v-if="isEditing('story_points')" @click.stop>
        <InputNumber
          :model-value="storyPointsModel"
          :min="0"
          :max="999"
          class="p-inputtext-sm"
          input-class="w-3rem"
          @update:model-value="(v: number | null) => emit('update:storyPointsModel', v)"
          @keydown.enter.prevent="emit('commitEdit')"
          @keydown.escape="emit('cancelEdit')"
          @blur="emit('commitEdit')"
        />
      </div>
      <span
        v-else
        class="inline-editable text-xs w-2rem text-center"
        @click.stop="emit('startEdit', 'story_points', ticket.story_points ?? null)"
      >
        {{ ticket.story_points != null ? ticket.story_points : '—' }}
      </span>
    </div>
  </div>
</template>
