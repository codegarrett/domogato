import type { Page } from '@playwright/test'

export class BacklogPage {
  constructor(private page: Page) {}

  async goto(projectId: string): Promise<void> {
    await this.page.goto(`/projects/${projectId}/backlog`)
    await this.page.waitForLoadState('networkidle')
  }

  async expectBacklogLoaded(): Promise<void> {
    await this.page.getByText(/backlog|sprint/i).first().waitFor({ state: 'visible' })
  }
}
