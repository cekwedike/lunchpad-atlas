import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for ATLAS frontend E2E tests.
 * Tests run against the production deployment at launchpadatlas.vercel.app.
 *
 * To run locally:
 *   cd frontend && npx playwright test
 *
 * Environment variables:
 *   TEST_EMAIL    - email address for test user login
 *   TEST_PASSWORD - password for test user login
 */
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
    baseURL: 'https://launchpadatlas.vercel.app',
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
