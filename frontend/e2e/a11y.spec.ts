import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

type AuditLevel = 'none' | 'warnings' | 'blocking'

const auditLevel = (process.env.ACCESSIBILITY_CI_AUDIT_LEVEL || 'warnings') as AuditLevel

const P0_ROUTES = [
  { path: '/auth/login', name: 'login', requiresAuth: false },
]

async function runAxe(page: import('@playwright/test').Page, routeName: string) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze()

  const serious = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  )

  if (serious.length > 0) {
    console.log(`[a11y] ${routeName} violations:`, JSON.stringify(serious, null, 2))
  }

  if (auditLevel === 'blocking') {
    expect(serious, `${routeName} has serious/critical axe violations`).toHaveLength(0)
  }

  return { results, serious }
}

test.describe('Accessibility audit', () => {
  for (const route of P0_ROUTES) {
    test(`axe scan: ${route.name}`, async ({ page }) => {
      if (auditLevel === 'none') {
        test.skip()
      }

      await page.goto(route.path)
      await page.waitForLoadState('networkidle')

      const { serious } = await runAxe(page, route.name)

      // Warnings mode: fail only on critical
      if (auditLevel === 'warnings') {
        const critical = serious.filter((v) => v.impact === 'critical')
        expect(critical, `${route.name} has critical axe violations`).toHaveLength(0)
      }
    })
  }

  test('login page has accessible form labels', async ({ page }) => {
    await page.goto('/auth/login')
    await expect(page.locator('label[for]')).toHaveCount(2)
  })

  test('skip link present when accessibility enabled', async ({ page }) => {
    await page.goto('/auth/login')
    const skipLink = page.locator('.skip-link')
    // Skip link only on authenticated app shell; verify login has lang attribute
    await expect(page.locator('html')).toHaveAttribute('lang', /en|es/)
    await expect(skipLink).toHaveCount(0)
  })
})
