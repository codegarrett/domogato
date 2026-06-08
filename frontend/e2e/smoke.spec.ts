import { test, expect } from './fixtures'
import { AppShellPage } from './pages/AppShellPage'

test.describe('Smoke Tests @smoke', () => {
  test('dashboard loads for authenticated admin', async ({ page }) => {
    const shell = new AppShellPage(page)
    await shell.gotoDashboard()
    await expect(page).not.toHaveURL(/auth\/login/)
    await expect(page.locator('body')).toBeVisible()
  })

  test('organizations page loads', async ({ page, seed }) => {
    await page.goto('/organizations')
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('link', { name: 'E2E Org' })).toBeVisible()
  })
})
