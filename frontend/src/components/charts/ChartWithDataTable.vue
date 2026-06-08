<template>
  <div class="chart-with-data-table">
    <div
      class="chart-canvas-wrap"
      role="img"
      :aria-label="title || $t('reports.chart')"
    >
      <slot />
    </div>
    <div v-if="showDataTable && tableRows.length > 0" class="chart-data-section">
      <Button
        :label="tableExpanded ? $t('a11y.hideChartData') : $t('a11y.showChartData')"
        text
        size="small"
        @click="tableExpanded = !tableExpanded"
      />
      <table
        v-if="tableExpanded"
        class="chart-data-table"
        :aria-label="$t('a11y.chartData')"
      >
        <thead>
          <tr>
            <th v-for="col in tableColumns" :key="col">{{ col }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, i) in tableRows" :key="i">
            <td v-for="(cell, j) in row" :key="j">{{ cell }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Button from 'primevue/button'

withDefaults(defineProps<{
  title?: string
  showDataTable?: boolean
  tableColumns?: string[]
  tableRows?: (string | number)[][]
}>(), {
  showDataTable: false,
  tableColumns: () => [],
  tableRows: () => [],
})

const tableExpanded = ref(false)
</script>

<style scoped>
.chart-canvas-wrap {
  position: relative;
  min-height: 200px;
}

.chart-data-section {
  margin-top: 0.5rem;
}
</style>
