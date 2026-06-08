import type { Page } from '@playwright/test'

export class LoginPage {
  constructor(private page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto('/auth/login')
  }

  async login(email: string, password: string): Promise<void> {
    await this.page.locator('#email').fill(email)
    await this.page.locator('#password').fill(password)
    await this.page.getByRole('button', { name: /sign in/i }).click()
    await this.page.waitForURL((url) => !url.pathname.includes('/auth/login'), { timeout: 15000 })
  }

  async expectError(): Promise<void> {
    await this.page.locator('.error-msg').waitFor({ state: 'visible' })
  }
}
