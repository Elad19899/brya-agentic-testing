/**
 * ─────────────────────────────────────────────────────────────────────────────
 * src/pages/components/FooterComponent.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Reusable component for the global site footer.
 *
 * The footer carries legal links (Privacy, Terms), social outbound links, and
 * secondary navigation. It is also the most common location for low-priority
 * regressions ("orphan" links pointing to dead URLs), so a dedicated component
 * lets us write thorough link-integrity tests in one place.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Locator, Page, expect } from '@playwright/test';

export class FooterComponent {
  constructor(private readonly page: Page) {}

  get root(): Locator {
    return this.page.locator('footer').first();
  }

  /** Every <a> inside the footer — used by link-integrity sweep tests. */
  get allLinks(): Locator {
    return this.root.locator('a[href]');
  }

  /** Privacy policy link (legally required). */
  get privacyLink(): Locator {
    return this.root.getByRole('link', { name: /privacy/i }).first();
  }

  /** Terms of service link (legally required). */
  get termsLink(): Locator {
    return this.root.getByRole('link', { name: /terms|conditions/i }).first();
  }

  /** Social outbound links — should open in a new tab with rel=noopener. */
  get socialLinks(): Locator {
    return this.root.locator(
      'a[href*="facebook.com"], a[href*="linkedin.com"], a[href*="instagram.com"], a[href*="twitter.com"], a[href*="x.com"]'
    );
  }

  /** Optional email-capture / newsletter form in the footer. */
  get newsletterInput(): Locator {
    return this.root.getByPlaceholder(/email/i).first();
  }

  async expectVisible(): Promise<void> {
    await this.root.scrollIntoViewIfNeeded();
    await expect(this.root).toBeVisible();
  }

  /** Collect every `href` in the footer — used to assert no dead links. */
  async collectHrefs(): Promise<string[]> {
    // `evaluateAll` snapshots the DOM immediately and does NOT auto-wait. On
    // the brya.com SPA the footer hydrates shortly after `domcontentloaded`,
    // so calling this right after `goto()` would otherwise race the footer and
    // return an empty array (silently skipping link-integrity tests). Wait for
    // the first footer link to attach first; tolerate a genuinely link-less
    // footer (teaser variants) by swallowing the timeout and returning [].
    await this.allLinks
      .first()
      .waitFor({ state: 'attached' })
      .catch(() => {
        /* no footer links rendered — fall through to an empty result */
      });

    const hrefs = await this.allLinks.evaluateAll(
      (anchors) =>
        anchors
          .map((a) => (a as HTMLAnchorElement).href)
          .filter((h) => !!h && !h.startsWith('javascript:') && !h.startsWith('mailto:') && !h.startsWith('tel:'))
    );
    // De-duplicate to avoid hitting the same URL multiple times.
    return Array.from(new Set(hrefs));
  }
}
