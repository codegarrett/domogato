import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test as base, type Page } from '@playwright/test'
import { e2eConfig, loadSeedState, type SeedState } from '../e2e.config'
import { E2EApiClient } from './api'

const __dirname = dirname(fileURLToPath(import.meta.url))

function loadAuthToken(storagePath: string): string | null {
  if (!existsSync(storagePath)) return null
  const state = JSON.parse(readFileSync(storagePath, 'utf-8')) as {
    origins?: Array<{ sessionStorage?: Array<{ name: string; value: string }> }>
  }
  return (
    state.origins?.[0]?.sessionStorage?.find((e) => e.name === 'projecthub-local-token')?.value ??
    null
  )
}

export interface E2EFixtures {
  seed: SeedState
  projectId: string
  projectKey: string
  apiClient: E2EApiClient
  adminPage: Page
}

const seed = loadSeedState()

export const test = base.extend<E2EFixtures>({
  seed: async ({}, use) => {
    if (!seed?.projectId) {
      throw new Error('Seed state not loaded — run global-setup first')
    }
    await use(seed as SeedState)
  },
  projectId: async ({ seed }, use) => {
    await use(seed.projectId!)
  },
  projectKey: async ({ seed }, use) => {
    await use(seed.projectKey)
  },
  apiClient: async ({ request }, use) => {
    await use(new E2EApiClient(request))
  },
  adminPage: async ({ page }, use) => {
    await use(page)
  },
  page: async ({ page }, use, testInfo) => {
    const authFile =
      testInfo.project.name === 'desktop-user'
        ? resolve(e2eConfig.authDir, 'user.json')
        : resolve(e2eConfig.authDir, 'admin.json')
    const token = loadAuthToken(authFile)
    if (token) {
      await page.addInitScript((t) => {
        sessionStorage.setItem('projecthub-local-token', t)
      }, token)
    }
    await use(page)
  },
})

export { expect } from '@playwright/test'

export function projectPath(projectId: string, subpath: string): string {
  return `/projects/${projectId}${subpath}`
}
