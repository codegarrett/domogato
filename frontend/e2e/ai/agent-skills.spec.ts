import { test, expect } from '../fixtures'
import { shouldSkipAiTests } from '../e2e.config'

test.describe('Agent Skills @ai', () => {
  test.beforeEach(() => {
    test.skip(shouldSkipAiTests(), 'LLM not configured (set LLM_* in .env or E2E_SKIP_AI=true)')
  })

  test('project agent skills page lists seeded skill', async ({ page, projectId, seed }) => {
    await page.goto(`/projects/${projectId}/agents/skills`)
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('E2E Weather').or(page.getByText(seed.agentSkillSlug || 'e2e-weather'))).toBeVisible()
  })

  test('admin agent skills page loads', async ({ page }) => {
    await page.goto('/admin/agent-skills')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(/agent skill|skill/i).first()).toBeVisible()
  })
})
