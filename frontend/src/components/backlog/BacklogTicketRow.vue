<script setup lang="ts">
import { computed } from 'vue'
import Tag from 'primevue/tag'
import Select from 'primevue/select'
import InputNumber from 'primevue/inputnumber'
import TicketInlineAssigneeCell from '@/components/tickets/TicketInlineAssigneeCell.vue'
import TicketInlineStatusCell from '@/components/tickets/TicketInlineStatusCell.vue'
import type { Ticket } from '@/api/tickets'
import './backlog-ticket-grid.css'

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
  <div class="backlog-ticket-grid ticket-row" :class="{ 'ticket-selected': selected }">
    <div class="grid-cell">
      <input type="checkbox" :checked="selected" @click.stop="emit('toggleSelect')" />
    </div>

    <div class="grid-cell">
      <i class="pi pi-bars text-color-secondary drag-handle" />
    </div>

    <div class="grid-cell grid-cell--start grid-cell--clip">
      <router-link :to="`/tickets/${ticket.id}`" class="ticket-key-link" @click.stop>
        <Tag :value="ticket.ticket_key || `#${ticket.ticket_number}`" severity="info" class="text-xs" />
      </router-link>
    </div>

    <div class="grid-cell grid-cell--title">
      <router-link :to="`/tickets/${ticket.id}`" class="ticket-title-link" @click.stop>
        {{ ticket.title }}
      </router-link>
    </div>

    <div class="grid-cell grid-cell--clip">
      <div v-if="isEditing('ticket_type')" class="w-full" @click.stop>
        <Select
          :model-value="editValue as string"
          :options="typeOptions"
          option-label="label"
          option-value="value"
          class="p-inputtext-sm w-full"
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
    </div>

    <div class="grid-cell grid-cell--clip">
      <div v-if="isEditing('priority')" class="w-full" @click.stop>
        <Select
          :model-value="editValue as string"
          :options="priorityOptions"
          option-label="label"
          option-value="value"
          class="p-inputtext-sm w-full"
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
    </div>

    <div class="grid-cell grid-cell--clip">
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
    </div>

    <div class="grid-cell grid-cell--clip">
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
    </div>

    <div class="grid-cell">
      <div v-if="isEditing('story_points')" class="story-points-input w-full" @click.stop>
        <InputNumber
          :model-value="storyPointsModel"
          :min="0"
          :max="999"
          class="p-inputtext-sm w-full"
          @update:model-value="(v: number | null) => emit('update:storyPointsModel', v)"
          @keydown.enter.prevent="emit('commitEdit')"
          @keydown.escape="emit('cancelEdit')"
          @blur="emit('commitEdit')"
        />
      </div>
      <span
        v-else
        class="story-points-value inline-editable"
        @click.stop="emit('startEdit', 'story_points', ticket.story_points ?? null)"
      >
        {{ ticket.story_points != null ? ticket.story_points : '—' }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.ticket-row {
  border-bottom: 1px solid var(--p-content-border-color);
  transition: background 0.12s;
}

.ticket-row:last-child {
  border-bottom: none;
}

.ticket-row:hover {
  background: var(--p-content-hover-background, var(--p-surface-50));
}

.ticket-selected {
  background: color-mix(in srgb, var(--p-primary-color) 8%, transparent);
}

.drag-handle {
  cursor: grab;
  opacity: 0.4;
  transition: opacity 0.15s;
}

.ticket-row:hover .drag-handle {
  opacity: 1;
}

.ticket-key-link,
.ticket-title-link {
  text-decoration: none;
  color: inherit;
  min-width: 0;
  max-width: 100%;
}

.ticket-title-link {
  display: block;
  font-weight: 500;
  color: var(--p-primary-color, #6366f1);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ticket-title-link:hover {
  text-decoration: underline;
}

.inline-editable {
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 4px;
  transition: background 0.15s;
}

.inline-editable:hover {
  background: var(--p-surface-100, #f1f5f9);
}

.inline-editable-tag {
  transition: opacity 0.15s, box-shadow 0.15s;
}

.inline-editable-tag:hover {
  opacity: 0.85;
  box-shadow: 0 0 0 2px var(--p-primary-200, #bfdbfe);
}
</style>
