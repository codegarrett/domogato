import { test, expect } from '../fixtures'
import { BoardPage } from '../pages/BoardPage'

test.describe('Board @smoke', () => {
  test('board loads with columns', async ({ page, projectId }) => {
    const board = new BoardPage(page)
    await board.goto(projectId)
    await expect(page.getByRole('heading', { name: 'Board' })).toBeVisible({ timeout: 15000 })
    await expect(page.getByText('To Do').first()).toBeVisible()
    await expect(page.getByText('In Progress').first()).toBeVisible()
  })

  test('seeded tickets appear on board', async ({ page, projectId }) => {
    const board = new BoardPage(page)
    await board.goto(projectId)
    await expect(page.getByText('E2E Login Bug').first()).toBeVisible({ timeout: 15000 })
  })
})
