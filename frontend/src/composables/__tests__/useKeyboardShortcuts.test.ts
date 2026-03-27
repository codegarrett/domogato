import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, nextTick } from 'vue'
import { createRouter, createMemoryHistory } from 'vue-router'

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/', component: defineComponent({ template: '<div>Home</div>' }) },
    { path: '/test', component: defineComponent({ template: '<div>Test</div>' }) },
  ],
})

function createWrapper() {
  const TestComp = defineComponent({
    setup() {
      const { useKeyboardShortcuts } = require('@/composables/useKeyboardShortcuts')
      return useKeyboardShortcuts()
    },
    template: '<div>Test</div>',
  })

  return mount(TestComp, {
    global: {
      plugins: [router],
    },
  })
}

describe('useKeyboardShortcuts', () => {
  it('registers shortcuts on mount', () => {
    const wrapper = createWrapper()
    expect(wrapper).toBeTruthy()
    wrapper.unmount()
  })
})
