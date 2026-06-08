import type { Page } from '@playwright/test'

export class ChatPanelPage {
  constructor(private page: Page) {}

  async open(): Promise<void> {
    const toggle = this.page.locator('[data-testid="chat-toggle"], .chat-fab, button[aria-label*="chat" i]').first()
    if (await toggle.isVisible().catch(() => false)) {
      await toggle.click()
    } else {
      await this.page.getByRole('button', { name: /ai|assistant|chat/i }).first().click()
    }
    await this.page.locator('.chat-panel, [data-testid="chat-panel"]').first().waitFor({ timeout: 10000 })
  }

  async sendMessage(text: string): Promise<void> {
    const input = this.page.locator('[data-testid="chat-input"], .chat-input textarea, .chat-input input').first()
    await input.fill(text)
    await this.page.locator('[data-testid="chat-send"], button[aria-label*="send" i]').first().click()
  }

  async waitForAssistantReply(timeout = 120000): Promise<void> {
    await this.page.locator('.chat-message-assistant, .message-assistant, [data-role="assistant"]').last().waitFor({
      state: 'visible',
      timeout,
    })
  }
}
