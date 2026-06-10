import { test, expect, projectPath } from '../fixtures'
import { e2eConfig } from '../e2e.config'

test.describe('Developer access @rbac', () => {
  test('create ticket button is visible', async ({ page, projectId }) => {
    await page.goto(projectPath(projectId, '/tickets'))
    await page.waitForLoadState('networkidle')

    await expect(page.getByTestId('create-ticket')).toBeVisible()
  })

  test('can create ticket via API', async ({ apiClient, projectId }) => {
    const token = await apiClient.login(e2eConfig.userEmail, e2eConfig.userPassword)
    const res = await apiClient.createTicket(projectId, 'Developer E2E ticket', token)
    expect(res.status()).toBe(201)
  })

  test('create ticket from ready story is available in queue when stories selected', async ({
    page,
    projectId,
    seed,
  }) => {
    const storyId = seed.readyStoryId
    test.skip(!storyId, 'readyStoryId not seeded')

    await page.goto(projectPath(projectId, '/user-stories'))
    await page.waitForLoadState('networkidle')

    const row = page.getByRole('row', { name: /ready for tickets/i })
    await row.getByRole('checkbox').click()
    await expect(page.getByTestId('create-ticket-from-stories')).toBeVisible()
  })
})
