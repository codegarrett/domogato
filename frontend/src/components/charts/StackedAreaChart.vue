<template>
  <Line :data="data" :options="mergedOptions" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  type ChartOptions,
  type ChartData,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

const props = withDefaults(defineProps<{
  data: ChartData<'line'>
  options?: ChartOptions<'line'>
}>(), {
  options: () => ({}),
})

const mergedOptions = computed<ChartOptions<'line'>>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: true, position: 'bottom' },
    tooltip: { mode: 'index', intersect: false },
  },
  scales: {
    x: { stacked: true },
    y: { stacked: true, beginAtZero: true },
  },
  elements: {
    line: { fill: true, tension: 0.3 },
  },
  ...props.options,
}))
</script>
