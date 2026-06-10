import { test, expect, projectPath } from '../fixtures'
import { E2EApiClient } from '../fixtures/api'
import { e2eConfig } from '../e2e.config'

test.describe('Reporter tickets @rbac', () => {
  test('create ticket button is hidden on ticket list', async ({ page, projectId }) => {
    await page.goto(projectPath(projectId, '/tickets'))
    await page.waitForLoadState('networkidle')

    await expect(page.getByTestId('create-ticket')).not.toBeVisible()
  })

  test('API rejects direct ticket creation', async ({ apiClient, projectId }) => {
    const token = await apiClient.login(e2eConfig.reporterEmail, e2eConfig.reporterPassword)
    const res = await apiClient.createTicket(projectId, 'Reporter blocked ticket', token)
    await E2EApiClient.expectForbidden(res, 'developer role or higher to create tickets')
  })

  test('can transition any ticket status via API', async ({ apiClient, seed }) => {
    const ticketId = seed.ticketIds?.[0]
    test.skip(!ticketId, 'ticketIds not seeded')

    const token = await apiClient.login(e2eConfig.reporterEmail, e2eConfig.reporterPassword)
    const transitions = await apiClient.getTicketTransitions(ticketId, token)
    expect(transitions.ok()).toBeTruthy()
    const options = (await transitions.json()) as Array<{ id: string }>
    test.skip(options.length === 0, 'no transitions available')

    const res = await apiClient.transitionTicket(ticketId, options[0].id, token)
    expect(res.ok()).toBeTruthy()
  })
})
