<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue'
import Tag from 'primevue/tag'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import TicketInlinePicker from '@/components/tickets/TicketInlinePicker.vue'
import TicketInlineNumberPicker from '@/components/tickets/TicketInlineNumberPicker.vue'
import TicketInlineAssigneeCell from '@/components/tickets/TicketInlineAssigneeCell.vue'
import TicketInlineStatusCell from '@/components/tickets/TicketInlineStatusCell.vue'
import type { Ticket } from '@/api/tickets'
import { ticketDetailPath } from '@/utils/ticketUrls'
import { gridPresetClass, type TicketTableColumnId } from './types'
import './ticket-table-grid.css'

const props = defineProps<{
  ticket: Ticket
  columns: TicketTableColumnId[]
  ticketKeyLabel: string
  selected: boolean
  editableTitle?: boolean
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
  formatDate?: (iso: string) => string
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

const presetClass = gridPresetClass(props.columns)

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

function formatCreated(iso: string): string {
  return props.formatDate?.(iso) ?? iso
}

const titleInputRef = ref<{ $el?: HTMLElement } | null>(null)

watch(
  () => isEditing('title'),
  (editing) => {
    if (!editing) return
    void nextTick(() => {
      const root = titleInputRef.value
      const el = root?.$el
      const input = (el?.tagName === 'INPUT' ? el : el?.querySelector?.('input')) as HTMLInputElement | null
      input?.focus()
      input?.select()
    })
  },
)
</script>

<template>
  <div class="ticket-table-grid ticket-row" :class="[presetClass, { 'ticket-selected': selected }]">
    <template v-for="col in columns" :key="col">
      <div v-if="col === 'select'" class="grid-cell">
        <input type="checkbox" :checked="selected" @click.stop="emit('toggleSelect')" />
      </div>

      <div v-else-if="col === 'drag'" class="grid-cell">
        <i class="pi pi-bars text-color-secondary drag-handle" />
      </div>

      <div v-else-if="col === 'key'" class="grid-cell grid-cell--start grid-cell--key">
        <router-link :to="ticketDetailPath(ticket.project_id, ticket)" class="ticket-key-link" @click.stop>
          {{ ticketKeyLabel }}
        </router-link>
      </div>

      <div v-else-if="col === 'title'" class="grid-cell grid-cell--title">
        <div
          v-if="editableTitle && isEditing('title')"
          class="flex align-items-center gap-1 w-full"
          @click.stop
        >
          <InputText
            ref="titleInputRef"
            :model-value="editValue as string"
            class="w-full p-inputtext-sm"
            @update:model-value="(v: string | undefined) => emit('update:editValue', v ?? '')"
            @keydown.enter.prevent="emit('commitEdit')"
            @keydown.escape="emit('cancelEdit')"
          />
          <Button icon="pi pi-check" size="small" text rounded @click="emit('commitEdit')" />
          <Button icon="pi pi-times" size="small" text rounded severity="secondary" @click="emit('cancelEdit')" />
        </div>
        <router-link
          v-else-if="editableTitle"
          :to="ticketDetailPath(ticket.project_id, ticket)"
          class="ticket-title-link inline-editable"
          @click.stop="emit('startEdit', 'title', ticket.title)"
        >
          {{ ticket.title }}
        </router-link>
        <router-link
          v-else
          :to="ticketDetailPath(ticket.project_id, ticket)"
          class="ticket-title-link"
          @click.stop
        >
          {{ ticket.title }}
        </router-link>
      </div>

      <div v-else-if="col === 'ticket_type'" class="grid-cell grid-cell--clip">
        <TicketInlinePicker
          :editing="isEditing('ticket_type')"
          :edit-value="(editValue as string) ?? ticket.ticket_type"
          :options="typeOptions"
          @update:edit-value="(v) => emit('update:editValue', v ?? null)"
          @start="emit('startEdit', 'ticket_type', ticket.ticket_type)"
          @commit="emit('commitEdit')"
          @cancel="emit('cancelEdit')"
        >
          <Tag
            :value="formatLabel(isEditing('ticket_type') ? (editValue as string) : ticket.ticket_type)"
            severity="secondary"
            class="text-xs inline-editable-tag"
          />
        </TicketInlinePicker>
      </div>

      <div v-else-if="col === 'priority'" class="grid-cell grid-cell--clip">
        <TicketInlinePicker
          :editing="isEditing('priority')"
          :edit-value="(editValue as string) ?? ticket.priority"
          :options="priorityOptions"
          @update:edit-value="(v) => emit('update:editValue', v ?? null)"
          @start="emit('startEdit', 'priority', ticket.priority)"
          @commit="emit('commitEdit')"
          @cancel="emit('cancelEdit')"
        >
          <Tag
            :value="formatLabel(isEditing('priority') ? (editValue as string) : ticket.priority)"
            :severity="prioritySeverity(isEditing('priority') ? (editValue as string) : ticket.priority)"
            class="text-xs inline-editable-tag"
          />
        </TicketInlinePicker>
      </div>

      <div v-else-if="col === 'assignee'" class="grid-cell grid-cell--clip">
        <TicketInlineAssigneeCell
          :ticket="ticket"
          :editing="isEditing('assignee_id')"
          v-model:edit-value="assigneeEditValue"
          :assignee-options="assigneeOptions"
          :resolve-assignee-name="resolveAssigneeName"
          compact
          @start="emit('startEdit', 'assignee_id', ticket.assignee_id)"
          @commit="emit('commitEdit')"
          @cancel="emit('cancelEdit')"
        />
      </div>

      <div v-else-if="col === 'status'" class="grid-cell grid-cell--clip">
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
          @cancel="emit('cancelEdit')"
        />
      </div>

      <div v-else-if="col === 'story_points'" class="grid-cell grid-cell--numeric">
        <TicketInlineNumberPicker
          :editing="isEditing('story_points')"
          :edit-value="storyPointsModel"
          :display-value="ticket.story_points != null ? String(ticket.story_points) : '—'"
          @update:edit-value="(v) => emit('update:storyPointsModel', v ?? null)"
          @start="emit('startEdit', 'story_points', ticket.story_points ?? null)"
          @commit="emit('commitEdit')"
          @cancel="emit('cancelEdit')"
        />
      </div>

      <div v-else-if="col === 'created_at'" class="grid-cell grid-cell--start">
        <span class="text-sm">{{ formatCreated(ticket.created_at) }}</span>
      </div>
    </template>
  </div>
</template>

<style scoped>
.ticket-row {
  border-bottom: 1px solid var(--p-content-border-color);
  transition: background 0.12s;
  min-height: 2.25rem;
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

.ticket-title-link {
  text-decoration: none;
  min-width: 0;
  max-width: 100%;
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
  opacity: 0.9;
}
</style>
