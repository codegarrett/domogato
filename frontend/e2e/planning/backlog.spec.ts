import { test, expect } from '../fixtures'
import { BacklogPage } from '../pages/BacklogPage'

test.describe('Backlog', () => {
  test('backlog page loads', async ({ page, projectId }) => {
    const backlog = new BacklogPage(page)
    await backlog.goto(projectId)
    await backlog.expectBacklogLoaded()
  })

  test('active sprint is visible', async ({ page, projectId }) => {
    await page.goto(`/projects/${projectId}/backlog`)
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('E2E Sprint 1')).toBeVisible()
  })
})
