<script setup lang="ts">
import { computed } from 'vue'
import ProgressSpinner from 'primevue/progressspinner'
import TicketTableHeader from './TicketTableHeader.vue'
import TicketTableRow from './TicketTableRow.vue'
import type { Ticket } from '@/api/tickets'
import type { TicketSortColumn, SortDirection } from '@/utils/ticketTableSort'
import type { TicketTableColumnId } from './types'
import './ticket-table-grid.css'

const props = withDefaults(defineProps<{
  tickets: Ticket[]
  columns: TicketTableColumnId[]
  projectId: string
  loading?: boolean
  emptyText?: string
  sortColumn: TicketSortColumn
  sortDirection: SortDirection
  selectedIds?: Set<string> | string[]
  editableTitle?: boolean
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
  formatDate?: (iso: string) => string
  showHeader?: boolean
}>(), {
  loading: false,
  emptyText: '',
  editableTitle: false,
  showHeader: true,
})

const emit = defineEmits<{
  sort: [column: TicketSortColumn]
  toggleSelect: [ticket: Ticket]
  toggleSelectAll: []
  startEdit: [ticket: Ticket, field: string, value: string | number | null]
  commitEdit: [ticket: Ticket]
  commitStatus: [ticket: Ticket, statusId: string | null]
  cancelEdit: []
  'update:editValue': [value: string | number | null]
  'update:storyPointsModel': [value: number | null]
}>()

function isSelected(ticket: Ticket): boolean {
  if (!props.selectedIds) return false
  if (props.selectedIds instanceof Set) return props.selectedIds.has(ticket.id)
  return props.selectedIds.includes(ticket.id)
}

const selectionEnabled = computed(() => props.selectedIds != null)
</script>

<template>
  <div
    class="ticket-table-wrap"
    role="grid"
    :aria-rowcount="tickets.length + (showHeader ? 1 : 0)"
    :aria-label="$t('nav.ticketsList')"
  >
    <TicketTableHeader
      v-if="showHeader"
      :columns="columns"
      :sort-column="sortColumn"
      :sort-direction="sortDirection"
      :tickets="selectionEnabled ? tickets : undefined"
      :selected-ids="selectionEnabled ? selectedIds : undefined"
      @sort="emit('sort', $event)"
      @toggle-select-all="emit('toggleSelectAll')"
    />

    <div v-if="loading && tickets.length === 0" class="ticket-table-loading">
      <ProgressSpinner style="width: 2.5rem; height: 2.5rem" stroke-width="4" />
    </div>

    <slot v-else name="body" :tickets="tickets" :row-props="{
      columns,
      editableTitle,
      editingId,
      editingField,
      editValue,
      typeOptions,
      priorityOptions,
      assigneeOptions,
      resolveAssigneeName,
      resolveStatusName,
      resolveStatusStyle,
      formatLabel,
      prioritySeverity,
      storyPointsModel,
      formatDate,
      ticketKeyLabel,
      isSelected,
    }">
      <div class="ticket-list">
        <TicketTableRow
          v-for="tk in tickets"
          :key="tk.id"
          :ticket="tk"
          :columns="columns"
          :ticket-key-label="ticketKeyLabel(tk)"
          :selected="isSelected(tk)"
          :editable-title="editableTitle"
          :editing-id="editingId"
          :editing-field="editingField"
          :edit-value="editValue"
          :type-options="typeOptions"
          :priority-options="priorityOptions"
          :assignee-options="assigneeOptions"
          :status-options="statusOptionsFor(tk)"
          :resolve-assignee-name="resolveAssigneeName"
          :resolve-status-name="resolveStatusName"
          :resolve-status-style="resolveStatusStyle"
          :format-label="formatLabel"
          :priority-severity="prioritySeverity"
          :story-points-model="storyPointsModel"
          :format-date="formatDate"
          @toggle-select="emit('toggleSelect', tk)"
          @start-edit="(field, value) => emit('startEdit', tk, field, value)"
          @commit-edit="emit('commitEdit', tk)"
          @commit-status="(statusId) => emit('commitStatus', tk, statusId)"
          @cancel-edit="emit('cancelEdit')"
          @update:edit-value="emit('update:editValue', $event)"
          @update:story-points-model="emit('update:storyPointsModel', $event)"
        />
      </div>
    </slot>

    <div
      v-if="!loading && tickets.length === 0 && emptyText"
      class="p-4 text-center text-color-secondary text-sm"
    >
      {{ emptyText }}
    </div>
  </div>
</template>

<style scoped>
.ticket-list {
  min-height: 2.5rem;
}
</style>
