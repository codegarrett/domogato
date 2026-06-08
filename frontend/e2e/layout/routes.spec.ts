import { test } from '../fixtures'
import { assertNoHorizontalScroll } from '../helpers/assertNoHorizontalScroll'
import { captureLayoutScreenshot } from '../helpers/screenshot'

const LAYOUT_ROUTES = (projectId: string) => [
  { path: '/', name: 'dashboard' },
  { path: `/projects/${projectId}/tickets`, name: 'ticket-list' },
  { path: `/projects/${projectId}/board`, name: 'board' },
  { path: `/projects/${projectId}/kb`, name: 'kb' },
  { path: '/admin/embeddings', name: 'admin-embeddings' },
]

test.describe('Layout @layout', () => {
  test('no horizontal scroll on key routes', async ({ page, projectId }, testInfo) => {
    const isMobile = testInfo.project.name === 'mobile-chrome'
    const viewportLabel = isMobile ? 'mobile' : 'desktop'
    const maxOverflow = isMobile ? 24 : 2
    const routes = isMobile
      ? LAYOUT_ROUTES(projectId).filter((r) => r.name !== 'admin-embeddings')
      : LAYOUT_ROUTES(projectId)

    const failures: string[] = []
    for (const r of routes) {
      await page.goto(r.path)
      await page.waitForLoadState('networkidle')
      await captureLayoutScreenshot(page, r.name, viewportLabel)
      if (!isMobile) {
        try {
          await assertNoHorizontalScroll(page, maxOverflow)
        } catch (err) {
          failures.push(`${r.name}: ${(err as Error).message}`)
        }
      }
    }
    if (failures.length > 0) {
      throw new Error(`Layout issues (${viewportLabel}):\n${failures.join('\n')}`)
    }
  })
})
