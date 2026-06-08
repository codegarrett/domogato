import { defineConfig, devices } from '@playwright/test'
import { e2eConfig } from './e2e/e2e.config'

const authDir = e2eConfig.authDir

export default defineConfig({
  testDir: './e2e',
  timeout: e2eConfig.defaultTimeout,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 2 : undefined,
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',
  reporter: [
    ['html', { open: 'never', outputFolder: 'e2e/playwright-report' }],
    ['list'],
  ],
  outputDir: 'e2e/test-results',
  use: {
    baseURL: e2eConfig.baseURL,
    trace: 'retain-on-failure',
    screenshot: e2eConfig.screenshotMode,
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'desktop-chrome',
      use: {
        ...devices['Desktop Chrome'],
        viewport: e2eConfig.desktopViewport,
        storageState: `${authDir}/admin.json`,
      },
      testIgnore: [/global-setup/, /global-teardown/, /auth\.setup/, /rbac\//],
    },
    {
      name: 'desktop-user',
      use: {
        ...devices['Desktop Chrome'],
        viewport: e2eConfig.desktopViewport,
        storageState: `${authDir}/user.json`,
      },
      testMatch: [/rbac/],
    },
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 5'],
        storageState: `${authDir}/admin.json`,
        screenshot: 'on',
      },
      testMatch: [/layout\//],
    },
    {
      name: 'ai-desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: e2eConfig.desktopViewport,
        storageState: `${authDir}/admin.json`,
      },
      testMatch: [/ai\//],
      timeout: e2eConfig.aiTimeout,
      retries: 0,
    },
    {
      name: 'unauthenticated',
      use: {
        ...devices['Desktop Chrome'],
        viewport: e2eConfig.desktopViewport,
      },
      testMatch: [/auth\/login\.spec/, /auth\/register\.spec/, /a11y\//],
    },
  ],
  webServer: undefined,
})
