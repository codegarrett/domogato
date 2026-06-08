import type { Page } from '@playwright/test'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export async function captureLayoutScreenshot(
  page: Page,
  routeName: string,
  viewport: string,
): Promise<void> {
  const outDir = resolve(__dirname, '../test-results/layout')
  const safeName = routeName.replace(/[^a-z0-9-]/gi, '-').toLowerCase()
  await page.screenshot({
    path: resolve(outDir, `${safeName}-${viewport}.png`),
    fullPage: true,
  })
}
