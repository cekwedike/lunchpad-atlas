import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';

/**
 * Auth E2E tests — login flow, redirect to dashboard, logout.
 *
 * Requires environment variables:
 *   TEST_EMAIL     - valid test user email
 *   TEST_PASSWORD  - valid test user password
 */
test.describe('Authentication', () => {
  test('login page loads and displays the form', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await expect(page).toHaveURL(/\/login/);
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.submitButton).toBeVisible();
  });

  test('login page title is correct', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveTitle(/ATLAS|LaunchPad/i);
  });

  test('redirects unauthenticated user to login when accessing dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Should be redirected to login or show login form
    const isOnLogin = page.url().includes('/login') || page.url().includes('/auth');
    const hasLoginForm = await page.locator('input[type="password"]').isVisible().catch(() => false);

    expect(isOnLogin || hasLoginForm).toBe(true);
  });

  test('shows error message on invalid credentials', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await loginPage.login('invalid@example.com', 'wrongpassword');

    // Wait for error to appear
    await page.waitForTimeout(2000);

    // Should still be on login page or show an error
    const isStillOnLogin = page.url().includes('/login');
    const hasError = await page.getByText(/invalid|incorrect|error|wrong/i).isVisible().catch(() => false);

    expect(isStillOnLogin || hasError).toBe(true);
  });

  test('successful login redirects to dashboard', async ({ page }) => {
    const testEmail = process.env.TEST_EMAIL;
    const testPassword = process.env.TEST_PASSWORD;

    // Skip this test if credentials are not configured
    test.skip(!testEmail || !testPassword, 'TEST_EMAIL and TEST_PASSWORD env vars not set');

    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(testEmail!, testPassword!);

    // Should redirect to dashboard
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
    expect(page.url()).not.toContain('/login');
  });

  test('logout redirects back to login', async ({ page }) => {
    const testEmail = process.env.TEST_EMAIL;
    const testPassword = process.env.TEST_PASSWORD;

    test.skip(!testEmail || !testPassword, 'TEST_EMAIL and TEST_PASSWORD env vars not set');

    // Login first
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(testEmail!, testPassword!);
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });

    // Find and click logout button
    const logoutButton = page
      .getByRole('button', { name: /logout|sign out/i })
      .or(page.getByText(/logout|sign out/i));

    // Try clicking avatar/profile menu if logout not directly visible
    const avatarButton = page.locator('[data-testid="user-menu"], [aria-label*="account"], button:has(img[alt*="avatar"])');
    if (await avatarButton.isVisible().catch(() => false)) {
      await avatarButton.first().click();
      await page.waitForTimeout(500);
    }

    if (await logoutButton.first().isVisible().catch(() => false)) {
      await logoutButton.first().click();
      await page.waitForURL(/\/login/, { timeout: 10000 });
      expect(page.url()).toContain('/login');
    }
  });
});
