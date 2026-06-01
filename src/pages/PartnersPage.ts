/**
 * ─────────────────────────────────────────────────────────────────────────────
 * src/pages/PartnersPage.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Page Object for the Partners page (`/partners`).
 *
 * This is Brya's B2B marketing surface — it pitches the health-plan
 * partnership program. It does NOT host a form: its "Contact" CTA links to
 * `/contact/`, where the real inquiry form lives (see `ContactPage`). Keep
 * this object focused on the marketing content; form coverage belongs in
 * `tests/ui/contact.spec.ts`.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Locator, Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class PartnersPage extends BasePage {
  protected readonly path = '/partners';
  protected readonly pageName = 'Partners';

  constructor(page: Page) {
    super(page);
  }

  // ── Locators ─────────────────────────────────────────────────────────────

  /** Hero section pitching the partnership program. */
  get hero(): Locator {
    return this.page.getByRole('heading', { name: /partner|health plan/i }).first();
  }

  /** The "Contact" CTA that routes users to the inquiry form at `/contact/`. */
  get contactCta(): Locator {
    return this.page.getByRole('link', { name: /contact/i }).first();
  }

  // ── Assertions ───────────────────────────────────────────────────────────

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/\/partners/);
  }

  async expectHeroVisible(): Promise<void> {
    await expect(this.hero).toBeVisible();
  }
}
