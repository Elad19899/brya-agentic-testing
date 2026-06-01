/**
 * ─────────────────────────────────────────────────────────────────────────────
 * tests/api/seo.spec.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * SEO-critical endpoint coverage.
 *
 * Brya's organic discoverability depends on:
 *   - `robots.txt` — search engines respect this; misconfiguration can drop
 *     the entire site from indexes
 *   - `sitemap.xml` — search engines crawl this for content discovery
 *   - `favicon.ico` — visible identity in tabs/bookmarks
 *   - `manifest.json` — PWA installability
 *
 * Each of these failing silently can lose Brya traffic — they get explicit
 * tests rather than relying on humans to notice.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { test, expect } from '../../src/fixtures/test-fixtures';

test.describe('API · SEO & discoverability', () => {
  // GETs /robots.txt and asserts it is served and does not contain a blanket
  // "Disallow: /" for all user-agents.
  // Validates: robots.txt exists and isn't accidentally de-indexing the site.
  test('@regression /robots.txt is served and not blocking everything', async ({ apiClient }) => {
    const res = await apiClient.get('/robots.txt');
    expect(res.status()).toBeLessThan(400);
    const body = await res.text();
    // A site that accidentally ships `Disallow: /` for the public crawler
    // de-indexes itself from Google overnight. Flag that catastrophically.
    expect(body, 'robots.txt should not block all user-agents from /').not.toMatch(
      /User-agent:\s*\*[\s\S]*?Disallow:\s*\/\s*(\n|$)/i
    );
  });

  // GETs /sitemap.xml and validates its XML shape; if absent, falls back to
  // checking robots.txt declares a Sitemap: directive.
  // Validates: a crawlable sitemap is discoverable one way or another.
  test('@regression /sitemap.xml exists or is referenced by robots', async ({ apiClient }) => {
    const direct = await apiClient.get('/sitemap.xml');
    if (direct.status() < 400) {
      const body = await direct.text();
      expect(body).toMatch(/<urlset|<sitemapindex/i);
      return;
    }
    // Some sites mount the sitemap elsewhere and point at it from robots.txt.
    const robots = await apiClient.get('/robots.txt');
    const text = await robots.text();
    expect(text, 'Either /sitemap.xml or a robots Sitemap: directive required').toMatch(
      /sitemap:/i
    );
  });

  // GETs /favicon.ico and asserts a < 400 status.
  // Validates: the favicon loads, preserving brand identity in tabs/bookmarks.
  test('@regression favicon is served', async ({ apiClient }) => {
    const res = await apiClient.get('/favicon.ico');
    expect(res.status(), 'favicon missing — degrades brand presence in tabs').toBeLessThan(400);
  });

  // Scans the homepage HTML for a manifest <link>; if present, GETs it and
  // asserts it loads (skips entirely if no manifest is declared).
  // Validates: a referenced PWA manifest is actually reachable.
  test('@regression manifest is served (or absent intentionally)', async ({ apiClient }) => {
    // Not all sites ship a PWA manifest. We only verify that IF one is
    // referenced it actually loads. Missing entirely → skip, not fail.
    const homepage = await apiClient.get('/');
    const html = await homepage.text();
    const match = html.match(/<link[^>]+rel=["']manifest["'][^>]*href=["']([^"']+)["']/i);
    test.skip(!match, 'No manifest declared');
    const res = await apiClient.get(match![1]);
    expect(res.status()).toBeLessThan(400);
  });
});
