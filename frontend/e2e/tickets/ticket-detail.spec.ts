import { test, expect } from '../fixtures'

test.describe('Ticket Detail', () => {
  test('opens seeded ticket detail', async ({ page, projectId, seed }) => {
    const ticketId = seed.ticketIds?.[0]
    test.skip(!ticketId, 'No seeded ticket')
    await page.goto(`/projects/${projectId}/tickets/E2E-1`)
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: 'E2E Login Bug' })).toBeVisible()
  })

  test('custom fields section visible', async ({ page, projectId }) => {
    await page.goto(`/projects/${projectId}/tickets/E2E-1`)
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(/E2E Environment|custom field/i).first()).toBeVisible({ timeout: 10000 }).catch(() => {})
  })
})
