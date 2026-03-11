import { Page, Locator } from '@playwright/test';

export class ResourcesPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly tabList: Locator;
  readonly resourceCards: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: /resources/i });
    this.tabList = page.getByRole('tablist').or(page.locator('[role="tablist"]'));
    this.resourceCards = page.locator('[data-testid="resource-card"], .resource-card, [class*="resource"]').first();
  }

  async goto() {
    await this.page.goto('/dashboard/resources');
  }

  async clickTab(tabName: string) {
    await this.page.getByRole('tab', { name: new RegExp(tabName, 'i') }).click();
  }

  async isLoaded() {
    await this.page.waitForLoadState('networkidle');
    return this.page.url().includes('/resources');
  }
}
