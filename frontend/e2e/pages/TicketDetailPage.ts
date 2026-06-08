import type { Page } from '@playwright/test'

export class TicketDetailPage {
  constructor(private page: Page) {}

  async goto(projectId: string, ticketId: string): Promise<void> {
    await this.page.goto(`/projects/${projectId}/tickets/${ticketId}`)
    await this.page.waitForLoadState('networkidle')
  }

  async editTitle(newTitle: string): Promise<void> {
    const title = this.page.locator('h1, .ticket-title, [data-testid="ticket-title"]').first()
    await title.click()
    const input = this.page.locator('input').filter({ hasText: '' }).first()
    if (await input.isVisible().catch(() => false)) {
      await input.fill(newTitle)
      await input.press('Enter')
    }
  }

  async addComment(text: string): Promise<void> {
    const textarea = this.page.locator('textarea').filter({ hasNot: this.page.locator('[aria-hidden]') }).first()
    await textarea.fill(text)
    await this.page.getByRole('button', { name: /comment|post|add/i }).first().click()
  }
}
