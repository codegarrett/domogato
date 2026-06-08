import { test, expect } from '../fixtures'
import { TicketListPage } from '../pages/TicketListPage'

test.describe('Ticket List', () => {
  test('search filters tickets', async ({ page, projectId }) => {
    const list = new TicketListPage(page)
    await list.goto(projectId)
    await list.search('Login Bug')
    await list.expectTicketVisible('E2E Login Bug')
  })

  test('ticket table renders rows', async ({ page, projectId }) => {
    await page.goto(`/projects/${projectId}/tickets`)
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('E2E Login Bug').first()).toBeVisible({ timeout: 15000 })
  })
})
