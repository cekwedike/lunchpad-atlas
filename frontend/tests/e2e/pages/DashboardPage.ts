import { Page, Locator } from '@playwright/test';

export class DashboardPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly statsSection: Locator;
  readonly checklistSection: Locator;
  readonly pointsDisplay: Locator;
  readonly rankDisplay: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: /dashboard|welcome/i });
    this.statsSection = page.locator('[data-testid="stats"], .stats, [class*="stat"]').first();
    this.checklistSection = page.getByText(/getting started|checklist/i).first();
    this.pointsDisplay = page.getByText(/points/i).first();
    this.rankDisplay = page.getByText(/rank/i).first();
  }

  async goto() {
    await this.page.goto('/dashboard/fellow');
  }

  async isLoaded() {
    await this.page.waitForLoadState('networkidle');
    return this.page.url().includes('/dashboard');
  }
}
