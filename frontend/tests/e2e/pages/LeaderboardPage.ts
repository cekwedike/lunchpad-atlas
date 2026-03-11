import { Page, Locator } from '@playwright/test';

export class LeaderboardPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly rankedList: Locator;
  readonly topEntries: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: /leaderboard/i });
    this.rankedList = page.locator('[data-testid="leaderboard-list"], [class*="leaderboard"]').first();
    this.topEntries = page.locator('[data-testid="rank-entry"], [class*="rank"]');
  }

  async goto() {
    await this.page.goto('/dashboard/leaderboard');
  }

  async isLoaded() {
    await this.page.waitForLoadState('networkidle');
    return this.page.url().includes('/leaderboard');
  }
}
