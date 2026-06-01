/**
 * ─────────────────────────────────────────────────────────────────────────────
 * src/pages/AboutPage.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Page Object for the About page (`/about`).
 *
 * The About page communicates Brya's mission to the 50+ wellness audience and
 * houses team / leadership content. Tests against this page verify:
 *   - Navigation resolves to /about
 *   - Mission-defining copy is present
 *   - The team / leadership section is rendered
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Locator, Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class AboutPage extends BasePage {
  protected readonly path = '/about';
  protected readonly pageName = 'About';

  constructor(page: Page) {
    super(page);
  }

  // ── Locators ─────────────────────────────────────────────────────────────

  /** Mission statement / hero copy — wording chosen to be resilient to small marketing changes. */
  get missionStatement(): Locator {
    return this.page.getByText(/mission|connect|social|community|wellness/i).first();
  }

  /** Section describing the team / founders. */
  get teamSection(): Locator {
    return this.page
      .getByRole('region', { name: /team|leadership|founders/i })
      .or(this.page.getByRole('heading', { name: /team|leadership|founders/i }))
      .first();
  }

  // ── Assertions ───────────────────────────────────────────────────────────

  /** Smoke assertion that the page rendered. */
  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/\/about/);
    await expect(this.heading).toBeVisible();
  }
}
