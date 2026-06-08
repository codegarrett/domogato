import { test, expect } from '../fixtures'

test.describe('Timeline', () => {
  test('timeline view renders', async ({ page, projectId }) => {
    await page.goto(`/projects/${projectId}/timeline`)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('.timeline-view, .gantt, canvas, svg').first()).toBeVisible({ timeout: 15000 })
  })
})
