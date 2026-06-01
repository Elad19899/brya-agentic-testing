/**
 * ─────────────────────────────────────────────────────────────────────────────
 * src/pages/HomePage.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Page Object for the brya.com homepage (`/`).
 *
 * The homepage is the primary marketing landing surface — it carries the
 * tagline "Get out. Get social. Repeat.", the primary CTAs (Get Started /
 * Download), hero imagery, social proof, and entry points into the app.
 *
 * This class exposes intent-revealing methods (`clickGetStarted`, …) so test
 * specs read at the business-flow level rather than the DOM level.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Locator, Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class HomePage extends BasePage {
  protected readonly path = '/';
  protected readonly pageName = 'Home';

  constructor(page: Page) {
    super(page);
  }

  // ── Locators ─────────────────────────────────────────────────────────────
  // Locators are getters (not properties) so they are re-evaluated on each
  // access — important on SPAs where the DOM is rebuilt across route changes.

  /** Hero tagline that anchors the brand: "Get out. Get social. Repeat." */
  get tagline(): Locator {
    // `visible: true` excludes the document `<title>`, whose text also matches
    // this regex — Playwright's text engine matches `<title>` regardless of
    // scope, which would otherwise make `tagline.or(heading)` resolve to two
    // elements and trip strict-mode.
    return this.page
      .getByText(/Get out\.?\s+Get social\.?\s+Repeat\.?/i)
      .filter({ visible: true })
      .first();
  }

  /** Primary above-the-fold CTA — wording varies (Get Started / Join / Download). */
  get primaryCta(): Locator {
    return this.page
      .getByRole('link', { name: /get started|join|download|sign\s*up/i })
      .or(this.page.getByRole('button', { name: /get started|join|download|sign\s*up/i }))
      .first();
  }

  /** Secondary "Learn more" / "About" CTA. */
  get secondaryCta(): Locator {
    return this.page
      .getByRole('link', { name: /learn more|about|how it works/i })
      .first();
  }

  /** App Store / Google Play download badges. */
  get appStoreBadges(): Locator {
    return this.page.locator(
      'a[href*="apps.apple.com"], a[href*="play.google.com"], img[alt*="App Store" i], img[alt*="Google Play" i]'
    );
  }

  /** Logo link in the header — should always route home. */
  get logo(): Locator {
    return this.page.getByRole('link', { name: /brya/i }).first();
  }

  // ── Actions ──────────────────────────────────────────────────────────────

  /** Click the primary CTA. Returns nothing — caller asserts on the resulting URL or modal. */
  async clickPrimaryCta(): Promise<void> {
    await this.primaryCta.click();
  }

  /** Click the secondary CTA. */
  async clickSecondaryCta(): Promise<void> {
    await this.secondaryCta.click();
  }

  // ── Assertions / domain queries ─────────────────────────────────────────

  /**
   * High-level assertion that the homepage loaded with the brand-defining
   * elements present. Used by smoke tests to fail fast.
   */
  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveTitle(/brya/i);
    await expect(this.tagline.or(this.heading)).toBeVisible();
  }

  /** Returns `true` if at least one app-store badge is rendered. */
  async hasAppStoreBadges(): Promise<boolean> {
    return (await this.appStoreBadges.count()) > 0;
  }
}
