import type { Page, Response } from '@playwright/test'

export async function waitForApi(
  page: Page,
  urlPattern: string | RegExp,
  trigger: () => Promise<void>,
): Promise<Response> {
  const [response] = await Promise.all([
    page.waitForResponse(
      (res) => {
        const url = res.url()
        return typeof urlPattern === 'string' ? url.includes(urlPattern) : urlPattern.test(url)
      },
      { timeout: 15000 },
    ),
    trigger(),
  ])
  return response
}

export async function waitForAppReady(page: Page): Promise<void> {
  await page.waitForLoadState('domcontentloaded')
  await page.locator('body').waitFor({ state: 'visible' })
}
