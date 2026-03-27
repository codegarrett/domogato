<template>
  <Scatter :data="data" :options="mergedOptions" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Scatter } from 'vue-chartjs'
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
  Legend,
  type ChartOptions,
  type ChartData,
} from 'chart.js'

ChartJS.register(LinearScale, PointElement, Title, Tooltip, Legend)

const props = withDefaults(defineProps<{
  data: ChartData<'scatter'>
  options?: ChartOptions<'scatter'>
}>(), {
  options: () => ({}),
})

const mergedOptions = computed<ChartOptions<'scatter'>>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: { enabled: true },
  },
  ...props.options,
}))
</script>
