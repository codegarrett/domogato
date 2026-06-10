import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export interface SeedState {
  adminEmail: string
  adminPassword: string
  userEmail: string
  userPassword: string
  guestEmail: string
  guestPassword: string
  reporterEmail: string
  reporterPassword: string
  maintainerEmail: string
  maintainerPassword: string
  orgSlug: string
  projectKey: string
  adminUserId?: string
  userUserId?: string
  guestUserId?: string
  reporterUserId?: string
  maintainerUserId?: string
  orgId?: string
  projectId?: string
  workflowId?: string
  sprintId?: string
  ticketIds?: string[]
  kbSpaceSlug?: string
  kbPageSlugs?: string[]
  customFieldId?: string
  agentSkillSlug?: string
  issueReportId?: string
  reporterIssueReportId?: string
  reporterStoryId?: string
  developerStoryId?: string
  readyStoryId?: string
}

export interface E2EConfig {
  baseURL: string
  apiURL: string
  adminEmail: string
  adminPassword: string
  userEmail: string
  userPassword: string
  guestEmail: string
  guestPassword: string
  reporterEmail: string
  reporterPassword: string
  maintainerEmail: string
  maintainerPassword: string
  screenshotMode: 'on' | 'only-on-failure' | 'off'
  skipAI: boolean
  skipReset: boolean
  seedStatePath: string
  authDir: string
  desktopViewport: { width: number; height: number }
  aiTimeout: number
  defaultTimeout: number
}

/** Skip @ai tests when explicitly disabled or when global-setup found no LLM configured. */
export function shouldSkipAiTests(): boolean {
  if (process.env.E2E_SKIP_AI === 'true') return true
  return process.env.E2E_AI_CONFIGURED === 'false'
}

/** Skip tests that require embeddings (semantic KB search, etc.). */
export function shouldSkipEmbeddingTests(): boolean {
  if (shouldSkipAiTests()) return true
  return process.env.E2E_EMBEDDINGS_CONFIGURED === 'false'
}

const seedStatePath = resolve(__dirname, '.seed-state.json')

export function loadSeedState(): SeedState | null {
  if (!existsSync(seedStatePath)) return null
  return JSON.parse(readFileSync(seedStatePath, 'utf-8')) as SeedState
}

export const e2eConfig: E2EConfig = {
  baseURL: process.env.E2E_BASE_URL || 'http://localhost',
  apiURL: process.env.E2E_API_URL || 'http://localhost/api/v1',
  adminEmail: process.env.E2E_ADMIN_EMAIL || 'e2e-admin@domogato.test',
  adminPassword: process.env.E2E_ADMIN_PASSWORD || 'E2eAdmin!Pass123',
  userEmail: process.env.E2E_USER_EMAIL || 'e2e-user@domogato.test',
  userPassword: process.env.E2E_USER_PASSWORD || 'E2eUser!Pass123',
  guestEmail: process.env.E2E_GUEST_EMAIL || 'e2e-guest@domogato.test',
  guestPassword: process.env.E2E_GUEST_PASSWORD || 'E2eGuest!Pass123',
  reporterEmail: process.env.E2E_REPORTER_EMAIL || 'e2e-reporter@domogato.test',
  reporterPassword: process.env.E2E_REPORTER_PASSWORD || 'E2eReporter!Pass123',
  maintainerEmail: process.env.E2E_MAINTAINER_EMAIL || 'e2e-maintainer@domogato.test',
  maintainerPassword: process.env.E2E_MAINTAINER_PASSWORD || 'E2eMaintainer!Pass123',
  screenshotMode: (process.env.E2E_SCREENSHOTS as E2EConfig['screenshotMode']) || 'only-on-failure',
  skipAI: process.env.E2E_SKIP_AI === 'true',
  skipReset: process.env.E2E_SKIP_RESET === 'true',
  seedStatePath,
  authDir: resolve(__dirname, '.auth'),
  desktopViewport: { width: 1280, height: 720 },
  aiTimeout: 120_000,
  defaultTimeout: 30_000,
}
