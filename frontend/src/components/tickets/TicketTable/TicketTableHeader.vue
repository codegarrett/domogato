<script setup lang="ts">
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
}>()

const emit = defineEmits<{
  sort: [column: TicketSortColumn]
}>()

const presetClass = gridPresetClass(props.columns)

function sortIcon(column: TicketSortColumn): string {
  if (props.sortColumn !== column) return 'pi-sort-alt sort-icon--inactive'
  return props.sortDirection === 'asc' ? 'pi-sort-amount-up-alt' : 'pi-sort-amount-down-alt'
}
</script>

<template>
  <div class="ticket-table-grid ticket-table-grid--header" :class="presetClass">
    <template v-for="col in columns" :key="col">
      <div v-if="col === 'select' || col === 'drag'" class="grid-cell" aria-hidden="true" />
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
</style>
