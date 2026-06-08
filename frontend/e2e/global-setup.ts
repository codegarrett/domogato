import { chromium, type FullConfig } from '@playwright/test'
import { execSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { e2eConfig, loadSeedState } from './e2e.config'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, '../..')

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

async function waitForOllama(): Promise<void> {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`${e2eConfig.ollamaURL}/api/tags`)
      if (res.ok) {
        console.log('[global-setup] Ollama ready')
        return
      }
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 2000))
  }
  throw new Error('[global-setup] Timed out waiting for Ollama')
}

async function ensureOllamaModels(): Promise<void> {
  if (e2eConfig.skipAI) {
    console.log('[global-setup] Skipping Ollama model pull (E2E_SKIP_AI=true)')
    return
  }
  for (const model of [e2eConfig.ollamaModel, e2eConfig.embeddingModel]) {
    try {
      const tags = await fetch(`${e2eConfig.ollamaURL}/api/tags`).then((r) => r.json())
      const names: string[] = (tags.models || []).map((m: { name: string }) => m.name.split(':')[0])
      if (names.some((n) => n === model || n.startsWith(`${model}:`))) {
        console.log(`[global-setup] Ollama model ${model} already present`)
        continue
      }
      console.log(`[global-setup] Pulling Ollama model ${model}...`)
      execSync(
        `docker compose -f docker-compose.yml -f docker-compose.e2e.yml exec -T ollama ollama pull ${model}`,
        { cwd: repoRoot, stdio: 'inherit' },
      )
    } catch (err) {
      console.warn(`[global-setup] Could not verify/pull model ${model}:`, err)
    }
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
  await waitForOllama()
  await ensureOllamaModels()
  await resetDatabase()

  const seed = loadSeedState()
  if (!seed?.projectId) {
    throw new Error('[global-setup] Seed state missing — e2e_reset may have failed')
  }

  if (!e2eConfig.skipAI) {
    const aiConfig = await fetch(`${e2eConfig.apiURL}/ai/config`).then((r) => r.json())
    if (!aiConfig.is_configured) {
      console.warn('[global-setup] AI not configured — AI tests may fail')
    }
  }

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

  process.env.E2E_SEED_PROJECT_ID = seed.projectId
  process.env.E2E_SEED_ORG_ID = seed.orgId
  process.env.E2E_SEED_PROJECT_KEY = seed.projectKey
  process.env.E2E_SEED_ORG_SLUG = seed.orgSlug
  if (seed.issueReportId) process.env.E2E_SEED_ISSUE_REPORT_ID = seed.issueReportId
  if (seed.kbSpaceSlug) process.env.E2E_SEED_KB_SPACE_SLUG = seed.kbSpaceSlug
}
