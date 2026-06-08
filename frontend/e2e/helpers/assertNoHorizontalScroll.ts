import { expect, type Page } from '@playwright/test'

export async function assertNoHorizontalScroll(page: Page, maxOverflow = 2): Promise<void> {
  const overflow = await page.evaluate(() => {
    const el = document.documentElement
    return el.scrollWidth - el.clientWidth
  })
  expect(overflow, `Page should not have horizontal overflow > ${maxOverflow}px`).toBeLessThanOrEqual(
    maxOverflow,
  )
}
