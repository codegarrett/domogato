<script setup lang="ts">

import { ref } from 'vue'

import draggable from 'vuedraggable'

import TicketTable from './TicketTable.vue'

import TicketTableRow from './TicketTableRow.vue'

import { PLANNING_COLUMNS } from './types'

import type { Ticket } from '@/api/tickets'

import type { TicketSortColumn, SortDirection } from '@/utils/ticketTableSort'

import { dragGroupIds } from '@/utils/planningMultiDrag'



const tickets = defineModel<Ticket[]>({ required: true })



const props = defineProps<{

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

  commitStatus: [ticket: Ticket, statusId: string | null]

  cancelEdit: []

  'update:editValue': [value: string | number | null]

  'update:storyPointsModel': [value: number | null]

  dragChange: [evt: { added?: { element: Ticket; newIndex: number }; moved?: { element: Ticket; newIndex: number } }]

  dragStart: [ticket: Ticket]

  dragEnd: []

  toggleSelectAll: []

}>()



const draggingGroupIds = ref<Set<string> | null>(null)

const draggedTicketId = ref<string | null>(null)

const multiDragCount = ref(0)



function isSelected(ticket: Ticket, selectedIds: Set<string>): boolean {

  return selectedIds.has(ticket.id)

}



function clearDragVisuals() {

  draggingGroupIds.value = null

  draggedTicketId.value = null

  multiDragCount.value = 0

}



function onDragStart(evt: { oldIndex?: number }) {

  const idx = evt.oldIndex

  if (idx == null || idx < 0 || idx >= tickets.value.length) return

  const ticket = tickets.value[idx]

  if (!ticket) return



  const ids = dragGroupIds(ticket.id, tickets.value, props.selectedIds)

  draggingGroupIds.value = new Set(ids)

  draggedTicketId.value = ticket.id

  multiDragCount.value = ids.length



  emit('dragStart', ticket)

}



function onDragEnd() {

  clearDragVisuals()

  emit('dragEnd')

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

    @toggle-select-all="emit('toggleSelectAll')"

  >

    <template #body="{ rowProps }">

      <draggable

        v-model="tickets"

        group="tickets"

        item-key="id"

        :animation="150"

        ghost-class="drag-ghost"

        drag-class="drag-active"

        :class="[

          'ticket-list',

          { 'ticket-list--multi-drag': multiDragCount > 1 },

        ]"

        handle=".drag-handle"

        @start="onDragStart"

        @end="onDragEnd"

        @change="emit('dragChange', $event)"

      >

        <template #item="{ element: tk }">

          <TicketTableRow

            :ticket="tk"

            :columns="PLANNING_COLUMNS"

            :ticket-key-label="ticketKeyLabel(tk)"

            :selected="isSelected(tk, selectedIds)"

            :multi-drag-in-group="draggingGroupIds?.has(tk.id) ?? false"

            :multi-drag-primary="draggedTicketId === tk.id"

            :multi-drag-count="multiDragCount"

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

            @commit-status="(statusId) => emit('commitStatus', tk, statusId)"

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



:deep(.ticket-list--multi-drag .drag-ghost) {

  opacity: 0.85;

  box-shadow: 0 6px 16px rgba(99, 102, 241, 0.25);

}



:deep(.drag-active) {

  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);

  border-radius: 6px;

}



:deep(.ticket-list--multi-drag .drag-active) {

  box-shadow: 0 6px 20px rgba(99, 102, 241, 0.35);

  outline: 2px solid var(--p-primary-color, #6366f1);

}

</style>

