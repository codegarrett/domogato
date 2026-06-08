import { test, expect } from '../fixtures'
import { ChatPanelPage } from '../pages/ChatPanelPage'
import { e2eConfig } from '../e2e.config'

test.describe('AI Chat @ai', () => {
  test.beforeEach(() => {
    test.skip(e2eConfig.skipAI, 'AI disabled (E2E_SKIP_AI=true)')
  })

  test('opens chat and sends message', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    const chat = new ChatPanelPage(page)
    await chat.open()
    await chat.sendMessage('Say hello in one word.')
    await chat.waitForAssistantReply()
    await expect(page.locator('.chat-flyout-chat, .chat-panel').first()).toBeVisible()
  })
})
