import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'

vi.mock('vue-chartjs', () => ({
  Bar: {
    name: 'Bar',
    props: ['data', 'options'],
    template: '<canvas data-testid="bar-chart" />',
  },
}))

vi.mock('chart.js', () => ({
  Chart: { register: vi.fn() },
  CategoryScale: {},
  LinearScale: {},
  BarElement: {},
  Title: {},
  Tooltip: {},
  Legend: {},
}))

describe('BarChart', () => {
  it('renders with provided data', async () => {
    const BarChart = (await import('@/components/charts/BarChart.vue')).default
    const data = {
      labels: ['Sprint 1', 'Sprint 2'],
      datasets: [{ label: 'Velocity', data: [20, 30], backgroundColor: '#6366f1' }],
    }
    const wrapper = mount(BarChart, { props: { data } })
    expect(wrapper.find('[data-testid="bar-chart"]').exists()).toBe(true)
  })
})
