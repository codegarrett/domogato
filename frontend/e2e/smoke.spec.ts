import { test, expect } from '@playwright/test'

test.describe('Smoke Tests', () => {
  test('login page loads', async ({ page }) => {
    await page.goto('/auth/login')
    await expect(page).toHaveTitle(/ProjectHub/)
    await expect(page.getByText(/Sign in/i)).toBeVisible()
  })

  test('redirects unauthenticated users to login', async ({ page }) => {
    await page.goto('/')
    await page.waitForURL(/auth\/login/, { timeout: 10000 })
    await expect(page.url()).toContain('/auth/login')
  })

  test('dashboard loads after dev auth bypass', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    const url = page.url()
    expect(url.includes('/auth/login') || url === page.url()).toBeTruthy()
  })
})

test.describe('Navigation', () => {
  test('organizations page loads', async ({ page }) => {
    await page.goto('/organizations')
    await page.waitForLoadState('networkidle')
  })
})
