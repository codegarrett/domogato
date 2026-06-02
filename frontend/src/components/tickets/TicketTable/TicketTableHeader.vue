<script setup lang="ts">
import { computed } from 'vue'
import type { Ticket } from '@/api/tickets'
import type { TicketSortColumn, SortDirection } from '@/utils/ticketTableSort'
import {
  columnLabelKey,
  columnToSortKey,
  gridPresetClass,
  isSortableColumn,
  type TicketTableColumnId,
} from './types'
import './ticket-table-grid.css'

const props = defineProps<{
  columns: TicketTableColumnId[]
  sortColumn: TicketSortColumn
  sortDirection: SortDirection
  /** When set, the select column shows a check-all control for these rows. */
  tickets?: Ticket[]
  selectedIds?: Set<string> | string[]
}>()

const emit = defineEmits<{
  sort: [column: TicketSortColumn]
  toggleSelectAll: []
}>()

const presetClass = gridPresetClass(props.columns)

const showSelectAll = computed(
  () => props.columns.includes('select') && props.tickets != null && props.selectedIds != null,
)

function isRowSelected(id: string): boolean {
  if (!props.selectedIds) return false
  if (props.selectedIds instanceof Set) return props.selectedIds.has(id)
  return props.selectedIds.includes(id)
}

const allSelected = computed(() => {
  const rows = props.tickets ?? []
  return rows.length > 0 && rows.every((t) => isRowSelected(t.id))
})

const someSelected = computed(() => (props.tickets ?? []).some((t) => isRowSelected(t.id)))

const indeterminate = computed(() => someSelected.value && !allSelected.value)

function sortIcon(column: TicketSortColumn): string {
  if (props.sortColumn !== column) return 'pi-sort-alt sort-icon--inactive'
  return props.sortDirection === 'asc' ? 'pi-sort-amount-up-alt' : 'pi-sort-amount-down-alt'
}
</script>

<template>
  <div class="ticket-table-grid ticket-table-grid--header" :class="presetClass">
    <template v-for="col in columns" :key="col">
      <div v-if="col === 'select'" class="grid-cell grid-cell--select-header">
        <input
          v-if="showSelectAll"
          type="checkbox"
          :checked="allSelected"
          :indeterminate="indeterminate"
          :aria-label="$t('tickets.selectAll')"
          @change="emit('toggleSelectAll')"
        />
      </div>
      <div v-else-if="col === 'drag'" class="grid-cell" aria-hidden="true" />
      <button
        v-else-if="isSortableColumn(col)"
        type="button"
        class="grid-cell sortable-header"
        :class="{ 'grid-cell--start': col === 'key' || col === 'title' }"
        :aria-sort="sortColumn === columnToSortKey(col) ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'"
        @click="emit('sort', columnToSortKey(col))"
      >
        <span>{{ $t(columnLabelKey(col)) }}</span>
        <i class="pi sort-icon" :class="sortIcon(columnToSortKey(col))" />
      </button>
    </template>
  </div>
</template>

<style scoped>
.sortable-header {
  border: none;
  background: transparent;
  cursor: pointer;
  gap: 0.25rem;
  padding: 0;
  font: inherit;
  color: inherit;
  text-transform: inherit;
  letter-spacing: inherit;
  transition: color 0.12s;
}

.sortable-header:hover {
  color: var(--p-text-color, #334155);
}

.sortable-header[aria-sort='ascending'],
.sortable-header[aria-sort='descending'] {
  color: var(--p-primary-color, #3b82f6);
}

.sort-icon {
  font-size: 0.75rem;
  flex-shrink: 0;
}

.sort-icon--inactive {
  opacity: 0.35;
}

.sortable-header:hover .sort-icon--inactive {
  opacity: 0.65;
}

.grid-cell--select-header {
  justify-content: center;
}
</style>
