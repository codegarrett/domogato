import { test, expect } from '../fixtures'

test.describe('Logout', () => {
  test('logout redirects to login', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: 'User menu' }).click()
    await page.getByText('Sign Out', { exact: true }).click()
    await expect(page).toHaveURL(/auth\/login/, { timeout: 10000 })
  })
})
