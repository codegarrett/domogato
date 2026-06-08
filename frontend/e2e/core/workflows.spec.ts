import { test, expect } from '../fixtures'

test.describe('Workflows', () => {
  test('lists workflows for organization', async ({ page, seed }) => {
    await page.goto(`/organizations/${seed.orgId}`)
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(/workflow|kanban/i).first()).toBeVisible()
  })

  test('workflow settings page loads', async ({ page }) => {
    await page.goto('/workflows')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).toBeVisible()
  })
})
