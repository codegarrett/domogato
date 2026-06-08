import { test, expect } from '../fixtures'

test.describe('Issue Reports', () => {
  test('queue lists seeded report', async ({ page, projectId }) => {
    await page.goto(`/projects/${projectId}/issue-reports`)
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('E2E Issue Report')).toBeVisible()
  })

  test('opens report detail', async ({ page, projectId, seed }) => {
    test.skip(!seed.issueReportId, 'No issue report seeded')
    await page.goto(`/projects/${projectId}/issue-reports/${seed.issueReportId}`)
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('E2E Issue Report')).toBeVisible()
  })
})
