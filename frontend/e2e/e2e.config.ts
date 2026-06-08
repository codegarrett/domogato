import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export interface SeedState {
  adminEmail: string
  adminPassword: string
  userEmail: string
  userPassword: string
  orgSlug: string
  projectKey: string
  adminUserId?: string
  userUserId?: string
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
}

export interface E2EConfig {
  baseURL: string
  apiURL: string
  ollamaURL: string
  adminEmail: string
  adminPassword: string
  userEmail: string
  userPassword: string
  screenshotMode: 'on' | 'only-on-failure' | 'off'
  skipAI: boolean
  skipReset: boolean
  ollamaModel: string
  embeddingModel: string
  seedStatePath: string
  authDir: string
  desktopViewport: { width: number; height: number }
  aiTimeout: number
  defaultTimeout: number
}

const seedStatePath = resolve(__dirname, '.seed-state.json')

export function loadSeedState(): SeedState | null {
  if (!existsSync(seedStatePath)) return null
  return JSON.parse(readFileSync(seedStatePath, 'utf-8')) as SeedState
}

export const e2eConfig: E2EConfig = {
  baseURL: process.env.E2E_BASE_URL || 'http://localhost',
  apiURL: process.env.E2E_API_URL || 'http://localhost/api/v1',
  ollamaURL: process.env.E2E_OLLAMA_URL || 'http://localhost:11434',
  adminEmail: process.env.E2E_ADMIN_EMAIL || 'e2e-admin@domogato.test',
  adminPassword: process.env.E2E_ADMIN_PASSWORD || 'E2eAdmin!Pass123',
  userEmail: process.env.E2E_USER_EMAIL || 'e2e-user@domogato.test',
  userPassword: process.env.E2E_USER_PASSWORD || 'E2eUser!Pass123',
  screenshotMode: (process.env.E2E_SCREENSHOTS as E2EConfig['screenshotMode']) || 'only-on-failure',
  skipAI: process.env.E2E_SKIP_AI === 'true',
  skipReset: process.env.E2E_SKIP_RESET === 'true',
  ollamaModel: process.env.E2E_OLLAMA_MODEL || 'llama3.2',
  embeddingModel: process.env.E2E_EMBEDDING_MODEL || 'nomic-embed-text',
  seedStatePath,
  authDir: resolve(__dirname, '.auth'),
  desktopViewport: { width: 1280, height: 720 },
  aiTimeout: 120_000,
  defaultTimeout: 30_000,
}
