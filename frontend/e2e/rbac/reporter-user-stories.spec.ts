import { test, expect, projectPath } from '../fixtures'
import { E2EApiClient } from '../fixtures/api'
import { e2eConfig } from '../e2e.config'

test.describe('Reporter user stories @rbac', () => {
  test('can save status on another user story', async ({ page, projectId, seed }) => {
    const storyId = seed.developerStoryId
    test.skip(!storyId, 'developerStoryId not seeded')

    await page.goto(projectPath(projectId, `/user-stories/${storyId}`))
    await page.waitForLoadState('networkidle')

    const statusSelect = page.getByTestId('user-story-status')
    await statusSelect.click()
    await page.getByRole('option', { name: /in progress/i }).click()

    await expect(page.getByText(/in progress/i).first()).toBeVisible({ timeout: 10000 })
  })

  test('can save status on own in-progress story via API', async ({ apiClient, projectId, seed }) => {
    const storyId = seed.reporterStoryId
    test.skip(!storyId, 'reporterStoryId not seeded')

    const token = await apiClient.login(e2eConfig.reporterEmail, e2eConfig.reporterPassword)
    const res = await apiClient.patchUserStory(
      projectId,
      storyId,
      { status: 'discovery' },
      token,
    )
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('discovery')
  })

  test('create ticket from story button is hidden for reporter', async ({ page, projectId, seed }) => {
    const storyId = seed.readyStoryId
    test.skip(!storyId, 'readyStoryId not seeded')

    await page.goto(projectPath(projectId, `/user-stories/${storyId}`))
    await page.waitForLoadState('networkidle')

    await expect(page.getByTestId('create-ticket-from-story')).not.toBeVisible()
  })

  test('create tickets from story queue action is hidden', async ({ page, projectId }) => {
    await page.goto(projectPath(projectId, '/user-stories'))
    await page.waitForLoadState('networkidle')

    await expect(page.getByTestId('create-ticket-from-stories')).not.toBeVisible()
  })

  test('API rejects create-tickets from user story', async ({ apiClient, projectId, seed }) => {
    const storyId = seed.readyStoryId
    test.skip(!storyId, 'readyStoryId not seeded')

    const token = await apiClient.login(e2eConfig.reporterEmail, e2eConfig.reporterPassword)
    const res = await apiClient.createTicketsFromStories(projectId, [storyId], token)
    await E2EApiClient.expectForbidden(res, 'developer role or higher')
  })
})
