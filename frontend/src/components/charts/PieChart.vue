<template>
  <Pie :data="data" :options="mergedOptions" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Pie } from 'vue-chartjs'
import {
  Chart as ChartJS,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  type ChartOptions,
  type ChartData,
} from 'chart.js'

ChartJS.register(ArcElement, Title, Tooltip, Legend)

const props = withDefaults(defineProps<{
  data: ChartData<'pie'>
  options?: ChartOptions<'pie'>
}>(), {
  options: () => ({}),
})

const mergedOptions = computed<ChartOptions<'pie'>>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: true, position: 'bottom' },
    tooltip: { enabled: true },
  },
  ...props.options,
}))
</script>
