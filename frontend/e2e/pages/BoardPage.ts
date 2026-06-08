import type { Page } from '@playwright/test'

export class BoardPage {
  constructor(private page: Page) {}

  async goto(projectId: string): Promise<void> {
    await this.page.goto(`/projects/${projectId}/board`)
    await this.page.waitForLoadState('networkidle')
  }

  async expectBoardLoaded(): Promise<void> {
    await this.page.locator('.board-view, .kanban-board, [data-testid="board-view"]').first().waitFor({ timeout: 15000 })
  }

  async expectColumn(name: string): Promise<void> {
    await this.page.locator('[data-testid="board-view"]').getByText(name, { exact: true }).first().waitFor({ state: 'visible' })
  }
}
