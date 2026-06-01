/**
 * ─────────────────────────────────────────────────────────────────────────────
 * tests/api/security-headers.spec.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Security-posture checks for HTTP response headers.
 *
 * Coverage:
 *   - HSTS — forces browsers to use HTTPS
 *   - X-Content-Type-Options — disables MIME sniffing
 *   - X-Frame-Options / CSP frame-ancestors — clickjacking defense
 *   - Referrer-Policy — privacy hygiene
 *   - No Server header leaking software version
 *
 * Each assertion includes a comment on WHY the header matters, so a failure
 * is easy to triage.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { test, expect } from '../../src/fixtures/test-fixtures';

test.describe('API · Security headers', () => {
  // GETs / and asserts the Strict-Transport-Security header is present with a
  // max-age directive.
  // Validates: HSTS is enabled, defending against protocol-downgrade attacks.
  test('@regression Strict-Transport-Security is set', async ({ apiClient }) => {
    // HSTS instructs browsers to refuse HTTP for the domain — a baseline
    // protection against downgrade attacks.
    const res = await apiClient.get('/');
    const hsts = res.headers()['strict-transport-security'];
    expect(hsts, 'HSTS header missing').toBeTruthy();
    expect(hsts).toMatch(/max-age=\d+/);
  });

  // GETs / and asserts X-Content-Type-Options equals "nosniff".
  // Validates: MIME sniffing is disabled, closing an old XSS vector.
  test('@regression X-Content-Type-Options is nosniff', async ({ apiClient }) => {
    // Prevents browsers from MIME-sniffing a response away from the declared
    // Content-Type, an old XSS vector.
    const res = await apiClient.get('/');
    expect(res.headers()['x-content-type-options']).toBe('nosniff');
  });

  // GETs / and asserts either X-Frame-Options or a CSP frame-ancestors directive
  // is set.
  // Validates: the site has clickjacking protection via one mechanism or another.
  test('@regression clickjacking protection (X-Frame-Options or CSP)', async ({ apiClient }) => {
    const res = await apiClient.get('/');
    const xfo = res.headers()['x-frame-options'];
    const csp = res.headers()['content-security-policy'] ?? '';
    const protectedByCSP = /frame-ancestors/i.test(csp);
    expect(
      Boolean(xfo) || protectedByCSP,
      'Either X-Frame-Options or CSP frame-ancestors must be set'
    ).toBeTruthy();
  });

  // GETs / and asserts a Referrer-Policy header is present (any explicit value).
  // Validates: the site makes a deliberate referrer-leakage choice.
  test('@regression Referrer-Policy is declared', async ({ apiClient }) => {
    const res = await apiClient.get('/');
    const policy = res.headers()['referrer-policy'];
    // We accept any explicit value — even "no-referrer-when-downgrade" — as
    // long as the site is making a deliberate choice.
    expect(policy, 'Referrer-Policy header should be present').toBeTruthy();
  });

  // GETs / and asserts the Server header contains no version-number pattern.
  // Validates: the server doesn't leak a software version that maps to CVEs.
  test('@regression Server header does not leak software version', async ({ apiClient }) => {
    const res = await apiClient.get('/');
    const server = (res.headers()['server'] ?? '').toLowerCase();
    // Detailed banners like "nginx/1.18.0 (Ubuntu)" hand attackers a CVE list.
    expect(server).not.toMatch(/\d+\.\d+\.\d+/);
  });

  // GETs / and asserts the Content-Type header declares a UTF-8 charset.
  // Validates: responses specify encoding, avoiding mojibake/parsing issues.
  test('@regression Content-Type declares charset', async ({ apiClient }) => {
    const res = await apiClient.get('/');
    const ct = res.headers()['content-type'] ?? '';
    expect(ct.toLowerCase(), 'Content-Type should declare UTF-8 charset').toContain('utf-8');
  });
});
