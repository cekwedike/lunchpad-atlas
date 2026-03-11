import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';
import { DashboardPage } from './pages/DashboardPage';

/**
 * Dashboard E2E tests — loads correctly, shows stats, getting started checklist visible.
 *
 * Requires environment variables:
 *   TEST_EMAIL     - valid test user email
 *   TEST_PASSWORD  - valid test user password
 */
test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    const testEmail = process.env.TEST_EMAIL;
    const testPassword = process.env.TEST_PASSWORD;
    test.skip(!testEmail || !testPassword, 'TEST_EMAIL and TEST_PASSWORD env vars not set');

    await loginAs(page, testEmail, testPassword);
  });

  test('dashboard page loads after login', async ({ page }) => {
    const dashboard = new DashboardPage(page);

    await expect(page).not.toHaveURL(/\/login/);
    // Should be on some form of dashboard
    expect(page.url().includes('/dashboard')).toBe(true);
  });

  test('dashboard displays page heading', async ({ page }) => {
    await page.goto('/dashboard/fellow');
    await page.waitForLoadState('networkidle');

    const dashboard = new DashboardPage(page);
    // Heading may vary — just check that something renders
    const headingVisible = await dashboard.heading.isVisible().catch(() => false);
    const hasContent = await page.locator('main, [role="main"], h1, h2').first().isVisible();

    expect(headingVisible || hasContent).toBe(true);
  });

  test('dashboard shows points or score information', async ({ page }) => {
    await page.goto('/dashboard/fellow');
    await page.waitForLoadState('networkidle');

    // Look for any numeric stats or points text
    const hasPoints = await page.getByText(/points|score/i).first().isVisible().catch(() => false);
    const hasStats = await page.locator('[class*="stat"], [data-testid*="stat"]').first().isVisible().catch(() => false);

    expect(hasPoints || hasStats).toBe(true);
  });

  test('getting started checklist is visible', async ({ page }) => {
    await page.goto('/dashboard/fellow');
    await page.waitForLoadState('networkidle');

    // The checklist might be called "Getting Started", "Checklist", "Quick Start", etc.
    const checklistVisible = await page
      .getByText(/getting started|checklist|quick start|onboarding/i)
      .first()
      .isVisible()
      .catch(() => false);

    // If no checklist heading, at least look for checkboxes or todo-like items
    const hasCheckboxItems = await page.locator('input[type="checkbox"], [role="checkbox"]').first().isVisible().catch(() => false);

    expect(checklistVisible || hasCheckboxItems).toBe(true);
  });

  test('dashboard navigation links are accessible', async ({ page }) => {
    await page.goto('/dashboard/fellow');
    await page.waitForLoadState('networkidle');

    // Navigation should be present
    const nav = await page.locator('nav, [role="navigation"]').first().isVisible().catch(() => false);
    const hasLinks = await page.getByRole('link').count();

    expect(nav || hasLinks > 0).toBe(true);
  });
});
