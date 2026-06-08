import type { Page } from '@playwright/test'

export class AppShellPage {
  constructor(private page: Page) {}

  async gotoDashboard(): Promise<void> {
    await this.page.goto('/')
    await this.page.waitForLoadState('networkidle')
  }

  async openCommandPalette(): Promise<void> {
    await this.page.keyboard.press('Control+k')
    await this.page.locator('.command-palette, [role="dialog"]').first().waitFor({ timeout: 5000 }).catch(() => {})
  }

  async logout(): Promise<void> {
    const userMenu = this.page.locator('.user-menu, [data-testid="user-menu"]').first()
    if (await userMenu.isVisible().catch(() => false)) {
      await userMenu.click()
    } else {
      await this.page.getByRole('button', { name: /profile|account|user/i }).first().click().catch(() => {})
    }
    await this.page.getByRole('menuitem', { name: /log out|sign out/i }).click()
    await this.page.waitForURL(/auth\/login/, { timeout: 10000 })
  }
}
