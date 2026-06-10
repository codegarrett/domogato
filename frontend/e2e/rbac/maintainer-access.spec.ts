import { test, expect } from '../fixtures'
import { e2eConfig } from '../e2e.config'

test.describe('Maintainer access @rbac', () => {
  test('can access organization workflows admin', async ({ page, seed }) => {
    const orgSlug = seed.orgSlug
    test.skip(!orgSlug, 'orgSlug not seeded')

    await page.goto('/workflows')
    await page.waitForLoadState('networkidle')

    await expect(page.getByText(/workflow/i).first()).toBeVisible()
  })

  test('reporter cannot access organization workflows admin', async ({ browser, seed }) => {
    const orgSlug = seed.orgSlug
    test.skip(!orgSlug, 'orgSlug not seeded')

    const context = await browser.newContext({
      storageState: `${e2eConfig.authDir}/reporter.json`,
    })
    const page = await context.newPage()
    await page.goto('/workflows')
    await page.waitForLoadState('networkidle')

    await expect(page.getByText(/requires/i).or(page.getByText(/access/i))).toBeVisible()
    await context.close()
  })
})
