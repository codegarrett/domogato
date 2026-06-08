import type { Page } from '@playwright/test'

export class AdminEmbeddingsPage {
  constructor(private page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto('/admin/embeddings')
    await this.page.waitForLoadState('networkidle')
  }

  async expectLoaded(): Promise<void> {
    await this.page.getByText(/embedding|reindex/i).first().waitFor({ state: 'visible' })
  }
}
