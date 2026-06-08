import { test, expect } from '../fixtures'
import { AdminEmbeddingsPage } from '../pages/AdminEmbeddingsPage'

test.describe('Admin Embeddings', () => {
  test('embeddings admin shows stats', async ({ page }) => {
    const admin = new AdminEmbeddingsPage(page)
    await admin.goto()
    await admin.expectLoaded()
  })
})
