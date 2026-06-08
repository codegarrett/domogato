import { test, expect } from '../fixtures'

test.describe('Import Tickets', () => {
  test('import wizard loads', async ({ page, projectId }) => {
    await page.goto(`/projects/${projectId}/import`)
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(/import/i).first()).toBeVisible()
  })
})
