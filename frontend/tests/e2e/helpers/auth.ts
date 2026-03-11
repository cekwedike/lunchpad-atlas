import { Page } from '@playwright/test';

export async function loginAs(page: Page, email?: string, password?: string, loginUrl = '/login/admin') {
  const testEmail = email ?? process.env.TEST_EMAIL ?? 'test@example.com';
  const testPassword = password ?? process.env.TEST_PASSWORD ?? 'password';

  await page.goto(loginUrl);
  await page.waitForLoadState('domcontentloaded');

  const emailField = page.locator('input[type="email"]').or(page.getByLabel(/email/i));
  await emailField.first().fill(testEmail);

  const passwordField = page.locator('input[type="password"]').or(page.getByLabel(/password/i));
  await passwordField.first().fill(testPassword);

  const submitBtn = page
    .getByRole('button', { name: /sign in|log in|login/i })
    .or(page.locator('button[type="submit"]'));
  await submitBtn.first().click();

  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 30000 });
  await page.waitForLoadState('domcontentloaded');
}
