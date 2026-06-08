import { test, expect } from '@playwright/test'
import { LoginPage } from '../pages/LoginPage'
import { e2eConfig } from '../e2e.config'

test.describe('Auth @smoke', () => {
  test('login page loads', async ({ page }) => {
    const login = new LoginPage(page)
    await login.goto()
    await expect(page).toHaveTitle(/ProjectHub|Domogato/i)
    await expect(page.getByLabel(/email/i)).toBeVisible()
  })

  test('login with valid credentials', async ({ page }) => {
    const login = new LoginPage(page)
    await login.goto()
    await login.login(e2eConfig.adminEmail, e2eConfig.adminPassword)
    await expect(page).not.toHaveURL(/auth\/login/)
  })

  test('login with invalid credentials shows error', async ({ page }) => {
    const login = new LoginPage(page)
    await login.goto()
    await page.locator('#email').fill('wrong@example.com')
    await page.locator('#password').fill('wrongpassword')
    await page.getByRole('button', { name: /sign in/i }).click()
    await login.expectError()
  })
})
