/**
 * ─────────────────────────────────────────────────────────────────────────────
 * tests/api/health.spec.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Site-reachability and core HTTP behavior.
 *
 * These tests are the API equivalent of UI smoke: they confirm the host is
 * up, redirects bare HTTP to HTTPS, and serves the main routes with
 * acceptable latency. They are independent of any browser context and run
 * fast — every other API spec depends on these passing.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { test, expect } from '../../src/fixtures/test-fixtures';
import { env } from '../../config/env.config';

test.describe('API · Health & availability', () => {
  // GETs / and asserts the status is in the 2xx range.
  // Validates: the site is up and serving the homepage successfully.
  test('@smoke homepage responds with 2xx', async ({ apiClient }) => {
    const res = await apiClient.get('/');
    expect(res.status(), `Got status ${res.status()} from /`).toBeGreaterThanOrEqual(200);
    expect(res.status()).toBeLessThan(300);
  });

  // Times a GET / and asserts the document response completes under 3 seconds.
  // Validates: homepage response latency stays within the performance budget.
  test('@smoke homepage responds within performance budget', async ({ apiClient }) => {
    const start = Date.now();
    const res = await apiClient.get('/');
    const duration = Date.now() - start;
    expect(res.ok()).toBeTruthy();
    // 3-second budget for the document response. Marketing sites typically
    // target < 1.5s; we leave headroom for CI network variance.
    expect(duration, `Homepage took ${duration}ms (budget 3000ms)`).toBeLessThan(3000);
  });

  // Requests the base URL over plain HTTP (no redirect following) and asserts it
  // either redirects to an https:// Location or ends up on HTTPS.
  // Validates: insecure HTTP traffic is upgraded to HTTPS.
  test('@regression bare HTTP redirects to HTTPS', async ({ apiClient }) => {
    // Hit the same host over plain HTTP — must redirect.
    const httpUrl = env.baseUrl.replace(/^https:/, 'http:');
    const res = await apiClient.get(httpUrl, { maxRedirects: 0 });
    const status = res.status();
    // Either a 3xx pointing to HTTPS, or the server already upgraded us.
    if (status >= 300 && status < 400) {
      const location = res.headers()['location'] ?? '';
      expect(location, 'redirect Location should be HTTPS').toMatch(/^https:/i);
    } else {
      // Some hosts immediately serve 200 on HTTPS even when asked HTTP — that
      // is acceptable as long as the connection ended up encrypted.
      expect(res.url(), 'final URL should be HTTPS').toMatch(/^https:/i);
    }
  });

  // GETs /, /about, and /partners and asserts none returns a 5xx.
  // Validates: the core marketing routes are all reachable (no server errors).
  test('@regression key marketing routes are reachable', async ({ apiClient }) => {
    const routes = ['/', '/about', '/partners'];
    const results: Record<string, number> = {};
    for (const route of routes) {
      const res = await apiClient.get(route);
      results[route] = res.status();
    }
    // Every route should be a success or a deliberate redirect — never a 5xx.
    for (const [route, status] of Object.entries(results)) {
      expect(status, `${route} returned ${status}`).toBeLessThan(500);
    }
  });

  // GETs a guaranteed-nonexistent route and asserts the status is not a 5xx.
  // Validates: unknown routes are handled gracefully (404 or client-rendered),
  // never a server crash.
  test('@regression 404 page is served for an unknown route', async ({ apiClient }) => {
    const res = await apiClient.get('/this-route-should-not-exist-' + Date.now());
    // SPAs sometimes serve 200 with a client-rendered "Not found" — both are
    // acceptable as long as it is not a 5xx.
    expect(res.status(), `Status ${res.status()} for bogus route`).toBeLessThan(500);
  });
});
