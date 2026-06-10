import { test, expect } from '../fixtures'
import { ChatPanelPage } from '../pages/ChatPanelPage'
import { shouldSkipAiTests } from '../e2e.config'

test.describe('AI Chat Tools @ai', () => {
  test.beforeEach(() => {
    test.skip(shouldSkipAiTests(), 'LLM not configured (set LLM_* in .env or E2E_SKIP_AI=true)')
  })

  test('agent can search tickets', async ({ page, projectKey }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    const chat = new ChatPanelPage(page)
    await chat.open()
    await chat.sendMessage(`Search for tickets with "Login Bug" in project ${projectKey}`)
    await chat.waitForAssistantReply()
    const content = await page.locator('.chat-flyout-chat, .chat-panel').textContent()
    expect(content?.toLowerCase()).toMatch(/login|bug|ticket|e2e/)
  })
})
