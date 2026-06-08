import { test, expect } from '../fixtures'

test.describe('RBAC @rbac', () => {

  test('member can view project tickets', async ({ page, projectId }) => {
    await page.goto(`/projects/${projectId}/tickets`)
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('E2E Login Bug').or(page.locator('table, .p-datatable'))).toBeVisible()
  })

  test('member cannot access admin users', async ({ page }) => {
    await page.goto('/admin/users')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('e2e-admin@domogato.test')).not.toBeVisible()
  })
})
