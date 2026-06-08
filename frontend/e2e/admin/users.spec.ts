import { test, expect } from '../fixtures'

test.describe('Admin Users', () => {
  test('lists users', async ({ page }) => {
    await page.goto('/admin/users')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('e2e-admin@domogato.test').first()).toBeVisible()
    await expect(page.getByText('e2e-user@domogato.test').first()).toBeVisible()
  })
})
