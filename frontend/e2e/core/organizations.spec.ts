import { test, expect } from '../fixtures'

test.describe('Organizations @smoke', () => {
  test('lists organizations', async ({ page, seed }) => {
    await page.goto('/organizations')
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('link', { name: 'E2E Org' })).toBeVisible()
  })

  test('opens organization detail', async ({ page, seed }) => {
    await page.goto(`/organizations/${seed.orgId}`)
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: 'E2E Org' })).toBeVisible()
  })
})
