/**
 * ─────────────────────────────────────────────────────────────────────────────
 * src/utils/test-data.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Factory functions producing deterministic-but-unique test data.
 *
 * Why a dedicated module?
 *   - Tests should never hardcode literals like "test@test.com". Unique data
 *     prevents collisions when multiple workers run in parallel and makes
 *     leaked test data easy to identify in production telemetry.
 *   - Centralizing factories means one place to update if the backend tightens
 *     validation rules.
 *
 * Note: We intentionally do NOT depend on `@faker-js/faker` to keep the
 * install footprint minimal — for this framework's needs, a few small
 * generators are sufficient.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { ContactInquiry } from '../pages/ContactPage';

/** Random integer in `[min, max]`. */
function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Cryptographically-weak but plenty-unique suffix for emails / names. */
function uniqueSuffix(): string {
  return `${Date.now().toString(36)}-${rand(1000, 9999)}`;
}

/**
 * Generate a syntactically valid contact-inquiry submission. Emails route to
 * an `@example.com` domain so they cannot reach a real inbox by accident.
 */
export function buildContactInquiry(overrides: Partial<ContactInquiry> = {}): ContactInquiry {
  const suffix = uniqueSuffix();
  return {
    reason: `Partnership inquiry (QA ${suffix})`,
    email: `qa.bot+${suffix}@example.com`,
    message:
      'This is an automated test submission from the Brya QA framework. ' +
      'Please disregard. Suffix: ' + suffix,
    ...overrides,
  };
}

/** Common malformed-email payloads for negative-path form-validation tests. */
export const invalidEmails = [
  'plainaddress',
  '@missing-local.com',
  'spaces in@example.com',
  'two@@example.com',
  'trailing.dot.@example.com',
];

/** Common XSS / injection payloads for free-text input hardening checks. */
export const securityPayloads = {
  xssBasic: '<script>alert(1)</script>',
  xssImg: '<img src=x onerror=alert(1)>',
  sqlInjection: "'; DROP TABLE users; --",
  longString: 'A'.repeat(10_000),
};
