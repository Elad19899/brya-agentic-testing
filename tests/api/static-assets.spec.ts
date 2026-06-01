/**
 * ─────────────────────────────────────────────────────────────────────────────
 * tests/api/static-assets.spec.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Sweep for broken / mis-cached static assets referenced from the homepage.
 *
 * Strategy:
 *   1. Fetch the homepage HTML.
 *   2. Extract every <link href> and <script src> URL.
 *   3. HEAD each one and assert < 400.
 *
 * This catches the classic "renamed the bundle, broke the cache, prod 404s
 * for 6 hours" regression class without any browser involvement.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { test, expect } from '../../src/fixtures/test-fixtures';

/** Naive but effective extractor — operates on the homepage HTML string. */
function extractAssetUrls(html: string, baseUrl: string): string[] {
  const urls = new Set<string>();
  const linkRegex = /<link[^>]+href=["']([^"']+)["']/gi;
  const scriptRegex = /<script[^>]+src=["']([^"']+)["']/gi;
  const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;

  for (const re of [linkRegex, scriptRegex, imgRegex]) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) {
      const raw = m[1];
      if (raw.startsWith('data:') || raw.startsWith('javascript:')) continue;
      try {
        const abs = new URL(raw, baseUrl).toString();
        urls.add(abs);
      } catch {
        /* ignore malformed */
      }
    }
  }
  return Array.from(urls);
}

test.describe('API · Static asset integrity', () => {
  // Fetches the homepage HTML, extracts up to 40 link/script/img asset URLs,
  // and HEAD-requests each (falling back to GET), collecting any >= 400.
  // Validates: static assets the homepage references aren't broken/404ing.
  test('@regression all assets referenced by the homepage are reachable', async ({ apiClient }) => {
    const homepage = await apiClient.get('/');
    expect(homepage.ok()).toBeTruthy();
    const html = await homepage.text();
    const assets = extractAssetUrls(html, homepage.url());

    test.skip(assets.length === 0, 'No assets discovered — homepage may be SSR-light');

    const failures: { url: string; status: number }[] = [];
    // Cap how many assets we probe per test run to keep runtimes reasonable.
    const limit = Math.min(assets.length, 40);
    for (let i = 0; i < limit; i++) {
      const url = assets[i];
      try {
        const res = await apiClient.head(url, { maxRedirects: 5 });
        if (res.status() >= 400) failures.push({ url, status: res.status() });
      } catch {
        // HEAD-unfriendly CDN — fall back to a lightweight GET.
        try {
          const res = await apiClient.get(url, { maxRedirects: 5 });
          if (res.status() >= 400) failures.push({ url, status: res.status() });
        } catch {
          failures.push({ url, status: 0 });
        }
      }
    }
    expect(failures, `Broken assets: ${JSON.stringify(failures, null, 2)}`).toEqual([]);
  });
});
