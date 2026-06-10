import { chromium, type FullConfig } from '@playwright/test'
import { execSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { e2eConfig, loadSeedState } from './e2e.config'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, '../..')

interface AiConfigProbe {
  is_configured: boolean
  provider?: string | null
  model?: string | null
  embedding_configured?: boolean
  embedding_provider?: string | null
  embedding_model?: string | null
}

async function waitForHealth(url: string, label: string, maxAttempts = 60): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetch(url)
      if (res.ok) {
        console.log(`[global-setup] ${label} ready`)
        return
      }
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 2000))
  }
  throw new Error(`[global-setup] Timed out waiting for ${label} at ${url}`)
}

async function probeAiConfig(): Promise<AiConfigProbe | null> {
  try {
    const res = await fetch(`${e2eConfig.apiURL}/ai/config`)
    if (!res.ok) return null
    return (await res.json()) as AiConfigProbe
  } catch {
    return null
  }
}

async function configureAiForTests(): Promise<void> {
  if (e2eConfig.skipAI) {
    process.env.E2E_AI_CONFIGURED = 'false'
    process.env.E2E_EMBEDDINGS_CONFIGURED = 'false'
    console.log('[global-setup] AI tests disabled (E2E_SKIP_AI=true)')
    return
  }

  const cfg = await probeAiConfig()
  if (!cfg) {
    process.env.E2E_AI_CONFIGURED = 'false'
    process.env.E2E_EMBEDDINGS_CONFIGURED = 'false'
    console.warn('[global-setup] Could not read /ai/config — @ai tests will be skipped')
    return
  }

  process.env.E2E_AI_CONFIGURED = cfg.is_configured ? 'true' : 'false'
  process.env.E2E_EMBEDDINGS_CONFIGURED = cfg.embedding_configured ? 'true' : 'false'

  writeFileSync(
    resolve(__dirname, '.ai-config.json'),
    JSON.stringify(cfg, null, 2),
  )

  if (cfg.is_configured) {
    console.log(
      `[global-setup] AI provider: ${cfg.provider ?? 'unknown'}/${cfg.model ?? 'unknown'}`,
    )
    if (!cfg.embedding_configured) {
      console.warn('[global-setup] Embeddings not configured — semantic search tests may be skipped')
    }
  } else {
    console.warn(
      '[global-setup] LLM not configured in API — set LLM_PROVIDER/LLM_MODEL/LLM_API_KEY in .env, or E2E_SKIP_AI=true',
    )
  }
}

async function resetDatabase(): Promise<void> {
  if (e2eConfig.skipReset) {
    console.log('[global-setup] Skipping DB reset (E2E_SKIP_RESET=true)')
    return
  }
  console.log('[global-setup] Resetting E2E database...')
  execSync(
    'docker compose -f docker-compose.yml -f docker-compose.e2e.yml exec -T api python scripts/e2e_reset.py',
    { cwd: repoRoot, stdio: 'inherit' },
  )
}

async function saveAuthState(
  baseURL: string,
  email: string,
  password: string,
  outFile: string,
): Promise<void> {
  const browser = await chromium.launch()
  const context = await browser.newContext({ baseURL })
  const page = await context.newPage()

  await page.goto('/auth/login')
  await page.locator('#email').fill(email)
  await page.locator('#password').fill(password)
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL((url) => !url.pathname.includes('/auth/login'), { timeout: 15000 })

  const token = await page.evaluate(() => sessionStorage.getItem('projecthub-local-token'))
  const baseState = await context.storageState()
  if (token) {
    const origin = baseURL.replace(/\/$/, '')
    const existing = baseState.origins.find((o) => o.origin === origin)
    if (existing) {
      existing.sessionStorage = [
        ...(existing.sessionStorage || []).filter((e) => e.name !== 'projecthub-local-token'),
        { name: 'projecthub-local-token', value: token },
      ]
    } else {
      baseState.origins.push({
        origin,
        localStorage: [],
        sessionStorage: [{ name: 'projecthub-local-token', value: token }],
      })
    }
  }
  writeFileSync(outFile, JSON.stringify(baseState, null, 2))
  await browser.close()
  console.log(`[global-setup] Saved auth state to ${outFile}`)
}

export default async function globalSetup(_config: FullConfig): Promise<void> {
  mkdirSync(e2eConfig.authDir, { recursive: true })

  await waitForHealth(`${e2eConfig.apiURL}/health`, 'API')
  await resetDatabase()

  const seed = loadSeedState()
  if (!seed?.projectId) {
    throw new Error('[global-setup] Seed state missing — e2e_reset may have failed')
  }

  await configureAiForTests()

  await saveAuthState(
    e2eConfig.baseURL,
    e2eConfig.adminEmail,
    e2eConfig.adminPassword,
    resolve(e2eConfig.authDir, 'admin.json'),
  )
  await saveAuthState(
    e2eConfig.baseURL,
    e2eConfig.userEmail,
    e2eConfig.userPassword,
    resolve(e2eConfig.authDir, 'user.json'),
  )
  await saveAuthState(
    e2eConfig.baseURL,
    e2eConfig.guestEmail,
    e2eConfig.guestPassword,
    resolve(e2eConfig.authDir, 'guest.json'),
  )
  await saveAuthState(
    e2eConfig.baseURL,
    e2eConfig.reporterEmail,
    e2eConfig.reporterPassword,
    resolve(e2eConfig.authDir, 'reporter.json'),
  )
  await saveAuthState(
    e2eConfig.baseURL,
    e2eConfig.maintainerEmail,
    e2eConfig.maintainerPassword,
    resolve(e2eConfig.authDir, 'maintainer.json'),
  )

  process.env.E2E_SEED_PROJECT_ID = seed.projectId
  process.env.E2E_SEED_ORG_ID = seed.orgId
  process.env.E2E_SEED_PROJECT_KEY = seed.projectKey
  process.env.E2E_SEED_ORG_SLUG = seed.orgSlug
  if (seed.issueReportId) process.env.E2E_SEED_ISSUE_REPORT_ID = seed.issueReportId
  if (seed.kbSpaceSlug) process.env.E2E_SEED_KB_SPACE_SLUG = seed.kbSpaceSlug
}
