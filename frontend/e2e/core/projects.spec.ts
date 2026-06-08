import { test, expect } from '../fixtures'

test.describe('Projects @smoke', () => {
  test('lists projects in sidebar', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('E2E Project').first()).toBeVisible({ timeout: 15000 })
  })

  test('opens project detail', async ({ page, projectId }) => {
    await page.goto(`/projects/${projectId}`)
    await expect(page.getByRole('heading', { name: 'E2E Project' })).toBeVisible({ timeout: 15000 })
  })

  test('opens project settings', async ({ page, projectId }) => {
    await page.goto(`/projects/${projectId}/settings`)
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(/settings/i).first()).toBeVisible()
  })
})
