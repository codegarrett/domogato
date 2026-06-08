import type { Page } from '@playwright/test'

export class KBPage {
  constructor(private page: Page) {}

  async gotoSpaces(projectId: string): Promise<void> {
    await this.page.goto(`/projects/${projectId}/kb`)
    await this.page.waitForLoadState('networkidle')
  }

  async gotoSpace(projectId: string, spaceSlug: string): Promise<void> {
    await this.page.goto(`/projects/${projectId}/kb/${spaceSlug}`)
    await this.page.waitForLoadState('networkidle')
  }

  async expectSpaceVisible(name: string): Promise<void> {
    await this.page.getByText(name).first().waitFor({ state: 'visible' })
  }
}
