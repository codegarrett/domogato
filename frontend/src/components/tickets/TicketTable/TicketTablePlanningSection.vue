<script setup lang="ts">
import draggable from 'vuedraggable'
import TicketTable from './TicketTable.vue'
import TicketTableRow from './TicketTableRow.vue'
import { PLANNING_COLUMNS } from './types'
import type { Ticket } from '@/api/tickets'
import type { TicketSortColumn, SortDirection } from '@/utils/ticketTableSort'

const tickets = defineModel<Ticket[]>({ required: true })

defineProps<{
  projectId: string
  loading?: boolean
  emptyText?: string
  sortColumn: TicketSortColumn
  sortDirection: SortDirection
  selectedIds: Set<string>
  editingId: string | null
  editingField: string | null
  editValue: string | number | null
  typeOptions: { label: string; value: string }[]
  priorityOptions: { label: string; value: string }[]
  assigneeOptions: { label: string; value: string }[]
  statusOptionsFor: (ticket: Ticket) => { label: string; value: string }[]
  resolveAssigneeName: (id: string | null) => string
  resolveStatusName: (id: string) => string
  resolveStatusStyle: (id: string) => Record<string, string>
  formatLabel: (s: string) => string
  prioritySeverity: (p: string) => 'success' | 'info' | 'warn' | 'danger' | 'secondary'
  storyPointsModel: number | null
  ticketKeyLabel: (ticket: Ticket) => string
}>()

const emit = defineEmits<{
  sort: [column: TicketSortColumn]
  toggleSelect: [ticket: Ticket]
  startEdit: [ticket: Ticket, field: string, value: string | number | null]
  commitEdit: [ticket: Ticket]
  commitStatus: [ticket: Ticket]
  cancelEdit: []
  'update:editValue': [value: string | number | null]
  'update:storyPointsModel': [value: number | null]
  dragChange: [evt: unknown]
}>()

function isSelected(ticket: Ticket, selectedIds: Set<string>): boolean {
  return selectedIds.has(ticket.id)
}
</script>

<template>
  <TicketTable
    :tickets="tickets"
    :columns="PLANNING_COLUMNS"
    :project-id="projectId"
    :loading="loading"
    :empty-text="emptyText"
    :sort-column="sortColumn"
    :sort-direction="sortDirection"
    :selected-ids="selectedIds"
    :editing-id="editingId"
    :editing-field="editingField"
    :edit-value="editValue"
    :type-options="typeOptions"
    :priority-options="priorityOptions"
    :assignee-options="assigneeOptions"
    :status-options-for="statusOptionsFor"
    :resolve-assignee-name="resolveAssigneeName"
    :resolve-status-name="resolveStatusName"
    :resolve-status-style="resolveStatusStyle"
    :format-label="formatLabel"
    :priority-severity="prioritySeverity"
    :story-points-model="storyPointsModel"
    :ticket-key-label="ticketKeyLabel"
    @sort="emit('sort', $event)"
  >
    <template #body="{ rowProps }">
      <draggable
        v-model="tickets"
        group="tickets"
        item-key="id"
        :animation="150"
        ghost-class="drag-ghost"
        drag-class="drag-active"
        class="ticket-list"
        @change="emit('dragChange', $event)"
      >
        <template #item="{ element: tk }">
          <TicketTableRow
            :ticket="tk"
            :columns="PLANNING_COLUMNS"
            :ticket-key-label="ticketKeyLabel(tk)"
            :selected="isSelected(tk, selectedIds)"
            :editing-id="rowProps.editingId"
            :editing-field="rowProps.editingField"
            :edit-value="rowProps.editValue"
            :type-options="rowProps.typeOptions"
            :priority-options="rowProps.priorityOptions"
            :assignee-options="rowProps.assigneeOptions"
            :status-options="statusOptionsFor(tk)"
            :resolve-assignee-name="rowProps.resolveAssigneeName"
            :resolve-status-name="rowProps.resolveStatusName"
            :resolve-status-style="rowProps.resolveStatusStyle"
            :format-label="rowProps.formatLabel"
            :priority-severity="rowProps.prioritySeverity"
            :story-points-model="rowProps.storyPointsModel"
            @toggle-select="emit('toggleSelect', tk)"
            @start-edit="(field, value) => emit('startEdit', tk, field, value)"
            @commit-edit="emit('commitEdit', tk)"
            @commit-status="emit('commitStatus', tk)"
            @cancel-edit="emit('cancelEdit')"
            @update:edit-value="emit('update:editValue', $event)"
            @update:story-points-model="emit('update:storyPointsModel', $event)"
          />
        </template>
      </draggable>
    </template>
  </TicketTable>
</template>

<style scoped>
.ticket-list {
  min-height: 2.5rem;
}

:deep(.drag-ghost) {
  opacity: 0.4;
  background: var(--p-primary-50, #eef2ff);
}

:deep(.drag-active) {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border-radius: 6px;
}
</style>
