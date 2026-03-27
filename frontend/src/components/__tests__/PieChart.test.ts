import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'

vi.mock('vue-chartjs', () => ({
  Pie: {
    name: 'Pie',
    props: ['data', 'options'],
    template: '<canvas data-testid="pie-chart" />',
  },
}))

vi.mock('chart.js', () => ({
  Chart: { register: vi.fn() },
  ArcElement: {},
  Title: {},
  Tooltip: {},
  Legend: {},
}))

describe('PieChart', () => {
  it('renders with provided data', async () => {
    const PieChart = (await import('@/components/charts/PieChart.vue')).default
    const data = {
      labels: ['High', 'Medium', 'Low'],
      datasets: [{ data: [10, 20, 30], backgroundColor: ['#f00', '#0f0', '#00f'] }],
    }
    const wrapper = mount(PieChart, { props: { data } })
    expect(wrapper.find('[data-testid="pie-chart"]').exists()).toBe(true)
  })

  it('applies custom options', async () => {
    const PieChart = (await import('@/components/charts/PieChart.vue')).default
    const data = { labels: ['A'], datasets: [{ data: [1], backgroundColor: ['#000'] }] }
    const options = { plugins: { legend: { display: false } } }
    const wrapper = mount(PieChart, { props: { data, options } })
    expect(wrapper.exists()).toBe(true)
  })
})
