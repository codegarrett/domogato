import type { FullConfig } from '@playwright/test'

export default async function globalTeardown(_config: FullConfig): Promise<void> {
  // Optional cleanup hook — stack is torn down via `make e2e-down`
}
