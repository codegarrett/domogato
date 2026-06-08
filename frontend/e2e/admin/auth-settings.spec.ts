import { test, expect } from '../fixtures'

test.describe('Admin Auth Settings', () => {
  test('auth settings page loads', async ({ page }) => {
    await page.goto('/admin/auth')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(/auth|local|oidc/i).first()).toBeVisible()
  })
})
