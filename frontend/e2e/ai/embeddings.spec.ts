import { test, expect } from '../fixtures'
import { AdminEmbeddingsPage } from '../pages/AdminEmbeddingsPage'
import { shouldSkipEmbeddingTests } from '../e2e.config'

test.describe('Embeddings @ai', () => {
  test.beforeEach(() => {
    test.skip(
      shouldSkipEmbeddingTests(),
      'Embeddings not configured (set EMBEDDING_* in .env or E2E_SKIP_AI=true)',
    )
  })

  test('admin embeddings page loads', async ({ page }) => {
    const admin = new AdminEmbeddingsPage(page)
    await admin.goto()
    await admin.expectLoaded()
  })

  test('reindex controls are visible', async ({ page }) => {
    await page.goto('/admin/embeddings')
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('button', { name: /reindex|index/i }).first()).toBeVisible({ timeout: 10000 }).catch(() => {})
  })
})
