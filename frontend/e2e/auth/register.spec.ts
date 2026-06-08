import { test, expect } from '@playwright/test'

test.describe('Register', () => {
  test('register page loads when registration enabled', async ({ page }) => {
    await page.goto('/auth/register')
    await page.waitForLoadState('networkidle')
    const url = page.url()
    if (url.includes('/auth/register')) {
      await expect(page.getByLabel(/email/i)).toBeVisible()
    } else {
      test.skip(true, 'Registration not enabled')
    }
  })
})
