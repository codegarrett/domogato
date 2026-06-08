import { test, expect } from '../fixtures'

test.describe('Sprints', () => {
  test('sprint list loads', async ({ page, projectId }) => {
    await page.goto(`/projects/${projectId}/sprints`)
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('E2E Sprint 1')).toBeVisible()
  })

  test('active sprint badge visible', async ({ page, projectId }) => {
    await page.goto(`/projects/${projectId}/sprints`)
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(/active|in progress/i).first()).toBeVisible()
  })
})
