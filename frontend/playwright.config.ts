import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for ATLAS frontend E2E tests.
 *
 * Base URL:
 *   PLAYWRIGHT_BASE_URL — defaults to http://localhost:3000 (start Next with `pnpm dev`)
 *   Omit or set to https://launchpadatlas.vercel.app to hit production (not recommended for PR CI).
 *
 * Credentials: TEST_EMAIL, TEST_PASSWORD
 */
const baseURL =
  process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  timeout: 60000,
  expect: { timeout: 15000 },

  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 20000,
    navigationTimeout: 30000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
});
