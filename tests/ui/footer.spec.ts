/**
 * ─────────────────────────────────────────────────────────────────────────────
 * tests/ui/footer.spec.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Footer integrity tests.
 *
 * Coverage:
 *   - Footer is rendered
 *   - Legally-required Privacy & Terms links are present
 *   - Outbound social links open in a new tab with safe `rel`
 *   - No dead links (every footer href resolves to < 400)
 *
 * The link-integrity sweep doubles as an API test on the side: we use HEAD
 * requests through the framework's ApiClient so it remains cheap.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { test, expect } from '../../src/fixtures/test-fixtures';

test.describe('Footer', () => {
  test.beforeEach(async ({ homePage }) => {
    await homePage.goto();
  });

  // Asserts the footer region renders on the homepage (loaded in beforeEach).
  // Validates: the footer is present and not silently dropped.
  test('@smoke footer is visible', async ({ footer }) => {
    await footer.expectVisible();
  });

  // Counts the Privacy and Terms links in the footer, asserting each exists.
  // Validates: legally-required Privacy/Terms links are present (GDPR/CCPA).
  test('@regression privacy and terms links are present', async ({ footer }) => {
    // The brya.com footer hydrates shortly after `domcontentloaded` (which is
    // all BasePage.goto() waits for), so an immediate `count()` would race the
    // hydration and read 0 — `count()` does not auto-wait. Use web-first
    // assertions that retry until each link attaches; we assert each
    // independently so the failure message names the missing one.
    await expect(footer.privacyLink, 'Privacy link required by GDPR/CCPA').toBeAttached();
    await expect(footer.termsLink, 'Terms link is a baseline legal requirement').toBeAttached();
  });

  // Iterates the footer's social links, checking each opens in a new tab and
  // carries rel="noopener".
  // Validates: outbound social links are safe against reverse-tabnabbing.
  test('@regression social outbound links use rel="noopener"', async ({ footer }) => {
    const socials = footer.socialLinks;
    const count = await socials.count();
    for (let i = 0; i < count; i++) {
      const link = socials.nth(i);
      const rel = (await link.getAttribute('rel')) ?? '';
      const target = (await link.getAttribute('target')) ?? '';
      expect(target, 'social links should open in a new tab').toContain('_blank');
      expect(rel, 'social outbound must include noopener for tabnabbing safety').toMatch(/noopener/);
    }
  });

  // Collects every footer href and HEAD-requests each (falling back to GET),
  // collecting any that return >= 400.
  // Validates: the footer has no dead/broken links.
  test('@regression all footer links resolve (no dead links)', async ({ footer, apiClient }) => {
    const hrefs = await footer.collectHrefs();
    test.skip(hrefs.length === 0, 'No footer links rendered yet');

    const failures: { url: string; status: number }[] = [];

    for (const href of hrefs) {
      try {
        // HEAD is enough — we only care about reachability, not body.
        const res = await apiClient.head(href, { maxRedirects: 5 });
        if (res.status() >= 400) failures.push({ url: href, status: res.status() });
      } catch (e) {
        // Some CDNs reject HEAD; fall back to GET before declaring a failure.
        try {
          const res = await apiClient.get(href, { maxRedirects: 5 });
          if (res.status() >= 400) failures.push({ url: href, status: res.status() });
        } catch (err) {
          failures.push({ url: href, status: 0 });
        }
      }
    }
    expect(failures, `Dead footer links: ${JSON.stringify(failures, null, 2)}`).toEqual([]);
  });
});
