import { test, expect } from '../fixtures'

test.describe('KB Pages', () => {
  test('opens seeded KB page', async ({ page, projectId, seed }) => {
    test.skip(!seed.kbSpaceSlug || !seed.kbPageSlugs?.[0], 'No KB pages seeded')
    await page.goto(`/projects/${projectId}/kb/${seed.kbSpaceSlug}/${seed.kbPageSlugs![0]}`)
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: 'Getting Started' }).first()).toBeVisible({ timeout: 15000 })
  })

  test('markdown content renders', async ({ page, projectId, seed }) => {
    test.skip(!seed.kbSpaceSlug || !seed.kbPageSlugs?.[1], 'No KB pages seeded')
    await page.goto(`/projects/${projectId}/kb/${seed.kbSpaceSlug}/${seed.kbPageSlugs![1]}`)
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('e2e-semantic-needle-42')).toBeVisible({ timeout: 15000 })
  })
})
