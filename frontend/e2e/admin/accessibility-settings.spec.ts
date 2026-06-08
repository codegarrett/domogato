import { test, expect } from '../fixtures'

test.describe('Admin Accessibility Settings', () => {
  test('accessibility settings page loads', async ({ page }) => {
    await page.goto('/admin/accessibility')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(/accessibility|motion|contrast/i).first()).toBeVisible()
  })
})
