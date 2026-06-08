import { test, expect } from '../fixtures'
import { TicketListPage } from '../pages/TicketListPage'

test.describe('Ticket CRUD @smoke', () => {
  test('creates a new ticket', async ({ page, projectId }) => {
    const list = new TicketListPage(page)
    await list.goto(projectId)
    await list.clickCreateTicket()
    const dialog = page.locator('.p-dialog').filter({ has: page.locator('#create-title') })
    await dialog.waitFor({ state: 'visible' })
    const title = `E2E New Ticket ${Date.now()}`
    await dialog.locator('#create-title').fill(title)
    await dialog.getByRole('button', { name: /^create$/i }).click()
    await expect(page.getByText(title)).toBeVisible({ timeout: 15000 })
  })

  test('seeded tickets are visible', async ({ page, projectId }) => {
    const list = new TicketListPage(page)
    await list.goto(projectId)
    await list.expectTicketVisible('E2E Login Bug')
    await list.expectTicketVisible('E2E API Endpoint')
  })
})
