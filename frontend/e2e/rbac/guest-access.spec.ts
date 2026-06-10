import { test, expect, projectPath } from '../fixtures'
import { E2EApiClient } from '../fixtures/api'
import { e2eConfig } from '../e2e.config'

test.describe('Guest access @rbac', () => {
  test('can view project tickets', async ({ page, projectId }) => {
    await page.goto(projectPath(projectId, '/tickets'))
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('E2E Login Bug').or(page.locator('.ticket-table-wrap'))).toBeVisible()
  })

  test('create ticket and new story controls are hidden', async ({ page, projectId }) => {
    await page.goto(projectPath(projectId, '/tickets'))
    await page.waitForLoadState('networkidle')
    await expect(page.getByTestId('create-ticket')).not.toBeVisible()

    await page.goto(projectPath(projectId, '/user-stories'))
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('button', { name: /new story/i })).not.toBeVisible()
  })

  test('API rejects user story creation and updates', async ({ apiClient, projectId, seed }) => {
    const storyId = seed.developerStoryId
    test.skip(!storyId, 'developerStoryId not seeded')

    const token = await apiClient.login(e2eConfig.guestEmail, e2eConfig.guestPassword)

    const createRes = await apiClient.createUserStory(projectId, 'Guest story', token)
    await E2EApiClient.expectForbidden(createRes, 'reporter role or higher')

    const patchRes = await apiClient.patchUserStory(
      projectId,
      storyId,
      { status: 'in_progress' },
      token,
    )
    await E2EApiClient.expectForbidden(patchRes, 'reporter role or higher to edit user stories')
  })
})
