/**
 * ─────────────────────────────────────────────────────────────────────────────
 * src/pages/BasePage.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Abstract base class for every Page Object in the framework.
 *
 * Responsibilities:
 *   1. Hold the shared Playwright `Page` reference.
 *   2. Provide common navigation + waiting helpers so concrete pages stay
 *      focused on page-specific selectors and flows.
 *   3. Expose convenience accessors for cross-page UI (navigation header,
 *      footer, etc.) so the inheritance hierarchy mirrors the real DOM.
 *
 * Architectural significance:
 *   - The POM pattern depends on a stable base: any logic that would otherwise
 *     be duplicated across page objects belongs here.
 *   - Methods are intentionally thin wrappers — they add **value** (logging,
 *     domain naming, default options) but never re-implement what Playwright
 *     already does well.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Page, Locator, expect, Response } from '@playwright/test';
import { logger } from '../utils/logger';

export abstract class BasePage {
  /**
   * Each concrete page declares its path (`/`, `/about`, …). The base class
   * uses it for `goto()` and URL assertions.
   */
  protected abstract readonly path: string;

  /**
   * Human-readable page name, used in logs and Allure step titles. Concrete
   * pages set this so failure output reads like a user journey, not a stack
   * trace.
   */
  protected abstract readonly pageName: string;

  constructor(protected readonly page: Page) {}

  /**
   * Navigate to this page's path. Returns the network response so callers can
   * assert on status, timing, or headers without re-issuing the request.
   *
   * Why `waitUntil: 'domcontentloaded'` instead of `'load'`?
   *   The brya.com SPA fires long-running analytics requests after DOM
   *   readiness. Waiting for full `load` would slow every test for no benefit.
   *   Individual tests can wait for stronger signals (an element, a network
   *   idle window) when they need to.
   */
  async goto(): Promise<Response | null> {
    logger.info(`Navigating to ${this.pageName} (${this.path})`);
    const response = await this.page.goto(this.path, {
      waitUntil: 'domcontentloaded',
    });
    return response;
  }

  /** Current absolute URL — useful for redirect / route assertions. */
  getUrl(): string {
    return this.page.url();
  }

  /** Document title — used in SEO / branding assertions. */
  async getTitle(): Promise<string> {
    return this.page.title();
  }

  /**
   * Assert that the browser landed on this page's path. We match on `endsWith`
   * rather than equality because Brya appends marketing query params on some
   * routes (utm_*, ref, …) that should not break the assertion.
   */
  async expectOnPage(): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(`${this.escapeRegex(this.path)}/?(\\?.*)?$`));
  }

  /**
   * Wait until network traffic settles. Used sparingly because it is slow and
   * brittle on analytics-heavy sites — but invaluable before screenshot/visual
   * assertions where late-loading hero imagery would otherwise cause flake.
   */
  async waitForNetworkIdle(timeoutMs = 15_000): Promise<void> {
    await this.page.waitForLoadState('networkidle', { timeout: timeoutMs });
  }

  /**
   * Take a full-page screenshot tagged with the page name and a caller-
   * provided suffix. Returned buffer is attached to the Allure step.
   */
  async screenshot(suffix = 'state'): Promise<Buffer> {
    return this.page.screenshot({
      fullPage: true,
      caption: `${this.pageName} — ${suffix}`,
    } as Parameters<Page['screenshot']>[0]);
  }

  /** Convenience accessor for the visible `<h1>`. */
  protected get heading(): Locator {
    return this.page.locator('h1').first();
  }

  /** Convenience accessor for the site header / nav region. */
  protected get header(): Locator {
    return this.page.locator('header, nav[role="navigation"]').first();
  }

  /** Convenience accessor for the site footer region. */
  protected get footer(): Locator {
    return this.page.locator('footer').first();
  }

  /** Escape user-supplied strings before embedding them in a RegExp. */
  private escapeRegex(input: string): string {
    return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
