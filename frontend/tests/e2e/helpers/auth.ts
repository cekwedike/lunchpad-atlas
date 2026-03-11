import { Page } from '@playwright/test';

/**
 * Login helper for reuse across test files.
 * Credentials are sourced from environment variables to avoid hardcoding.
 *
 * Set TEST_EMAIL and TEST_PASSWORD before running:
 *   TEST_EMAIL=user@example.com TEST_PASSWORD=secret npx playwright test
 */
export async function loginAs(page: Page, email?: string, password?: string) {
  const testEmail = email ?? process.env.TEST_EMAIL ?? 'test@example.com';
  const testPassword = password ?? process.env.TEST_PASSWORD ?? 'password';

  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');

  // Fill email
  const emailField = page.locator('input[type="email"]').or(page.getByLabel(/email/i));
  await emailField.first().fill(testEmail);

  // Fill password
  const passwordField = page.locator('input[type="password"]').or(page.getByLabel(/password/i));
  await passwordField.first().fill(testPassword);

  // Submit
  const submitBtn = page
    .getByRole('button', { name: /sign in|log in|login/i })
    .or(page.locator('button[type="submit"]'));
  await submitBtn.first().click();

  // Wait for redirect away from login
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
}
