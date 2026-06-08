import type { Page } from '@playwright/test'

export class TicketListPage {
  constructor(private page: Page) {}

  async goto(projectId: string): Promise<void> {
    await this.page.goto(`/projects/${projectId}/tickets`)
    await this.page.waitForLoadState('networkidle')
  }

  async search(query: string): Promise<void> {
    const search = this.page.getByPlaceholder(/search/i).or(this.page.locator('input[type="search"]')).first()
    await search.fill(query)
    await this.page.waitForTimeout(500)
  }

  async expectTicketVisible(title: string): Promise<void> {
    await this.page.getByText(title, { exact: false }).first().waitFor({ state: 'visible' })
  }

  async clickCreateTicket(): Promise<void> {
    await this.page.getByRole('button', { name: 'Create Ticket' }).click()
  }
}
