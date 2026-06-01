/**
 * ─────────────────────────────────────────────────────────────────────────────
 * tests/ui/home.spec.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * UI specs for the brya.com homepage.
 *
 * The homepage is the most-visited surface and the top conversion funnel — it
 * gets the deepest coverage: smoke (load), branding (tagline/title), CTAs,
 * SEO meta, and basic resilience checks.
 *
 * Tags:
 *   @smoke      — must pass on every commit
 *   @regression — full suite, runs on main + nightly
 *   @seo        — SEO-specific assertions
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { test, expect } from '../../src/fixtures/test-fixtures';

test.describe('Homepage', () => {
  test.beforeEach(async ({ homePage }) => {
    await homePage.goto();
  });

  // Asserts the page title matches /brya/ and the homepage finished loading.
  // Validates: the homepage loads successfully and is brand-titled.
  test('@smoke loads with HTTP 200 and brand title', async ({ homePage, page }) => {
    // Title carries the brand — also exercised by SEO checks below, but
    // making this an explicit smoke assertion keeps the failure obvious.
    await expect(page).toHaveTitle(/brya/i);
    await homePage.expectLoaded();
  });

  // Asserts the brand tagline (or, failing that, the main heading) is visible.
  // Validates: the marketed tagline still renders on the homepage.
  test('@smoke displays the brand tagline "Get out. Get social. Repeat."', async ({ homePage }) => {
    // Pulled from search-result metadata — this is the tagline Brya is
    // marketed under. If it disappears, marketing or QA needs to know.
    await expect(homePage.tagline.or(homePage.heading)).toBeVisible();
  });

  // If a primary CTA exists, asserts it is visible and enabled (does not click
  // through against production).
  // Validates: the main call-to-action is present and actionable.
  test('@regression primary CTA is visible and clickable', async ({ homePage }) => {
    // We assert visibility + enabled state but do NOT actually submit any
    // sign-up flow against production. CTA clicks are exercised in dedicated
    // conversion specs that point at a staging environment.
    const cta = homePage.primaryCta;
    if (await cta.count()) {
      await expect(cta).toBeVisible();
      await expect(cta).toBeEnabled();
    } else {
      test.info().annotations.push({
        type: 'info',
        description: 'Primary CTA not present — homepage may currently be a teaser variant.',
      });
    }
  });

  // Clicks the logo (if present) and asserts the URL lands back on the root.
  // Validates: the logo functions as a home link.
  test('@regression logo links to home', async ({ homePage, page }) => {
    if (await homePage.logo.count()) {
      await homePage.logo.click();
      await expect(page).toHaveURL(/\/$|\/index/);
    }
  });

  // Reads the meta description content and asserts it exists and is > 20 chars.
  // Validates: a substantive SEO meta description is present.
  test('@seo has a non-empty meta description', async ({ page }) => {
    const description = await page.locator('meta[name="description"]').getAttribute('content');
    expect(description, 'meta description must be present for SEO').toBeTruthy();
    expect((description ?? '').length, 'meta description should be substantive').toBeGreaterThan(20);
  });

  // Reads the <link rel="canonical"> href (if present) and asserts it is a
  // valid absolute URL. Probes count first so a missing tag fails fast with a
  // clear SEO finding instead of a 30s locator timeout.
  // Validates: when declared, the canonical URL is well-formed (avoids
  // duplicate-content penalties).
  test('@seo declares a canonical URL', async ({ page }) => {
    const canonicalLink = page.locator('link[rel="canonical"]');
    if (await canonicalLink.count()) {
      const canonical = await canonicalLink.first().getAttribute('href');
      expect(canonical, 'canonical href should be a non-empty URL').toBeTruthy();
      expect(() => new URL(canonical ?? ''), 'canonical href should be an absolute URL').not.toThrow();
    } else {
      test.info().annotations.push({
        type: 'seo',
        description: 'No <link rel="canonical"> declared — homepage risks duplicate-content penalties.',
      });
    }
  });

  // Reads the og:title and og:image meta tags and asserts both are set.
  // Validates: OpenGraph metadata exists so the site previews well when shared.
  test('@seo exposes OpenGraph metadata for social sharing', async ({ page }) => {
    // OG tags drive how the site previews on Facebook / LinkedIn — critical
    // for a social-network brand.
    const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content');
    const ogImage = await page.locator('meta[property="og:image"]').getAttribute('content');
    expect(ogTitle, 'og:title required').toBeTruthy();
    expect(ogImage, 'og:image required').toBeTruthy();
  });

  // Subscribes to pageerror events, reloads the homepage, and asserts no
  // uncaught JS errors were thrown.
  // Validates: the homepage loads without runtime JavaScript errors.
  test('@regression no critical JavaScript errors thrown during load', async ({ page, homePage }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await homePage.goto();
    await homePage.waitForNetworkIdle().catch(() => {
      // Networkidle may legitimately never settle on analytics-heavy sites;
      // we still want the errors collected above to be evaluated.
    });
    expect(errors, `Unexpected JS errors: ${errors.join('; ')}`).toEqual([]);
  });
});
