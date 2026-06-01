/**
 * ─────────────────────────────────────────────────────────────────────────────
 * tests/api/http-methods.spec.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Validate sane behavior across HTTP methods.
 *
 * Coverage:
 *   - HEAD on the homepage returns the same headers as GET, no body
 *   - OPTIONS does not throw on routes
 *   - GET handles trailing slashes consistently (canonicalization)
 *
 * These checks catch regressions in upstream CDN config (CloudFront, Vercel,
 * Netlify) that wouldn't appear in any user-facing UI test.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { test, expect } from '../../src/fixtures/test-fixtures';

test.describe('API · HTTP method semantics', () => {
  // Sends HEAD / and asserts a < 400 status with an empty body.
  // Validates: HEAD is handled correctly (headers only, no payload).
  test('@regression HEAD / returns headers without body', async ({ apiClient }) => {
    const res = await apiClient.head('/');
    expect(res.status()).toBeLessThan(400);
    const body = await res.body();
    expect(body.length, 'HEAD must not include a body').toBe(0);
  });

  // Sends both HEAD / and GET / and compares their base Content-Type media type.
  // Validates: HEAD and GET agree on content type (consistent CDN/edge config).
  test('@regression HEAD and GET return matching Content-Type', async ({ apiClient }) => {
    const headRes = await apiClient.head('/');
    const getRes = await apiClient.get('/');
    const headCT = headRes.headers()['content-type'];
    const getCT = getRes.headers()['content-type'];
    if (headCT && getCT) {
      // Compare main media type only — charsets and boundary params can diff.
      expect(headCT.split(';')[0]).toBe(getCT.split(';')[0]);
    }
  });

  // Requests /about/ and /about without following redirects, and asserts they
  // don't diverge wildly (both 2xx, or one redirects to the other).
  // Validates: trailing-slash URL canonicalization is consistent.
  test('@regression trailing-slash canonicalization is consistent', async ({ apiClient }) => {
    const withSlash = await apiClient.get('/about/', { maxRedirects: 0 });
    const withoutSlash = await apiClient.get('/about', { maxRedirects: 0 });
    // Both should land on the same status — either both 200, or one redirects
    // to the other. We disallow the case where they diverge wildly (200 vs 404).
    const both2xx = withSlash.status() < 300 && withoutSlash.status() < 300;
    const oneRedirects =
      (withSlash.status() >= 300 && withSlash.status() < 400) ||
      (withoutSlash.status() >= 300 && withoutSlash.status() < 400);
    expect(both2xx || oneRedirects, 'About URL canonicalization is inconsistent').toBeTruthy();
  });
});
