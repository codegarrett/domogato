import { test, expect, projectPath } from '../fixtures'
import { E2EApiClient } from '../fixtures/api'
import { e2eConfig } from '../e2e.config'

test.describe('Reporter issue reports @rbac', () => {
  test('can edit own issue report', async ({ page, projectId, seed }) => {
    const reportId = seed.reporterIssueReportId
    test.skip(!reportId, 'reporterIssueReportId not seeded')

    await page.goto(projectPath(projectId, `/issue-reports/${reportId}`))
    await page.waitForLoadState('networkidle')

    await page.getByRole('button', { name: /edit/i }).click()
    await page.locator('input').first().fill('Updated by reporter E2E')
    await page.getByRole('button', { name: /save/i }).click()

    await expect(page.getByText('Updated by reporter E2E')).toBeVisible({ timeout: 10000 })
  })

  test('create ticket from issue report is hidden', async ({ page, projectId, seed }) => {
    const reportId = seed.reporterIssueReportId
    test.skip(!reportId, 'reporterIssueReportId not seeded')

    await page.goto(projectPath(projectId, `/issue-reports/${reportId}`))
    await page.waitForLoadState('networkidle')

    await expect(page.getByTestId('create-ticket-from-issue-report')).not.toBeVisible()
  })

  test('API rejects create ticket from issue reports', async ({ apiClient, projectId, seed }) => {
    const reportId = seed.reporterIssueReportId
    test.skip(!reportId, 'reporterIssueReportId not seeded')

    const token = await apiClient.login(e2eConfig.reporterEmail, e2eConfig.reporterPassword)
    const res = await apiClient.createTicketFromIssueReports(projectId, [reportId], token)
    await E2EApiClient.expectForbidden(res, 'developer role or higher')
  })
})
