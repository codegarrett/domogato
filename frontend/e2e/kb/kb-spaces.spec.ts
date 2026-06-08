import { test, expect } from '../fixtures'
import { KBPage } from '../pages/KBPage'

test.describe('KB Spaces @smoke', () => {
  test('lists KB spaces', async ({ page, projectId }) => {
    const kb = new KBPage(page)
    await kb.gotoSpaces(projectId)
    await kb.expectSpaceVisible('E2E Knowledge')
  })

  test('navigates to space', async ({ page, projectId, seed }) => {
    test.skip(!seed.kbSpaceSlug, 'No KB space seeded')
    const kb = new KBPage(page)
    await kb.gotoSpace(projectId, seed.kbSpaceSlug!)
    await expect(page.getByText('E2E Knowledge').first()).toBeVisible()
  })
})
