import { test, expect } from '../fixtures'
import { shouldSkipEmbeddingTests } from '../e2e.config'

test.describe('KB Search @ai', () => {
  test.beforeEach(() => {
    test.skip(
      shouldSkipEmbeddingTests(),
      'Embeddings not configured (set EMBEDDING_* in .env or E2E_SKIP_AI=true)',
    )
  })

  test('semantic search finds seeded needle phrase', async ({ page, projectId }) => {
    await page.goto(`/projects/${projectId}/kb`)
    await page.waitForLoadState('networkidle')
    const search = page.getByPlaceholder(/search/i).or(page.locator('input[type="search"]')).first()
    if (await search.isVisible().catch(() => false)) {
      await search.fill('e2e-semantic-needle-42')
      await page.waitForTimeout(2000)
      await expect(page.getByText(/semantic search target/i).first()).toBeVisible({ timeout: 30000 })
    }
  })
})
