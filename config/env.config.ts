/**
 * ─────────────────────────────────────────────────────────────────────────────
 * config/env.config.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Centralized, type-safe environment configuration loader.
 *
 * Purpose:
 *   - Read environment variables from `.env` (or the CI environment) exactly
 *     once at startup and expose them as a strongly-typed `EnvConfig` object.
 *   - Provide sensible defaults so tests can run with zero local setup against
 *     the public brya.com site.
 *
 * Architectural significance:
 *   - Every other module (POM, API client, fixtures, playwright.config.ts)
 *     imports from here — this is the single source of truth for runtime
 *     configuration. Adding a new tunable knob means adding it in ONE place.
 *   - Keeping env parsing isolated makes it trivial to swap to a remote secret
 *     manager (Vault, AWS SM) later without touching consumer code.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load `.env` from the project root. `silent: true` so missing .env (e.g. in CI
// where vars come from the runner) does not produce noisy warnings.
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

/**
 * Strongly-typed shape of every runtime knob the framework cares about.
 * Adding a new variable? Add it here first, then in `.env.example`.
 */
export interface EnvConfig {
  /** Base URL of the web application under test. */
  readonly baseUrl: string;
  /** Base URL for API requests (may equal baseUrl for public sites). */
  readonly apiBaseUrl: string;
  /** Default action/assertion timeout in ms. */
  readonly defaultTimeout: number;
  /** Navigation (page.goto / page.waitForURL) timeout in ms. */
  readonly navigationTimeout: number;
  /**
   * Artificial delay (ms) inserted by Playwright before each browser action
   * (click, fill, navigation, etc.). Lets a human visually follow UI runs.
   * 0 = full speed. Applied to UI (browser) projects only.
   */
  readonly slowMo: number;
  /** Per-test retry count — overridden to 2 inside the CI environment. */
  readonly retries: number;
  /** Parallel worker count (undefined = Playwright default). */
  readonly workers: number | undefined;
  /** Run browsers visibly. Useful for local debugging only. */
  readonly headed: boolean;
  /** Tag for Allure reports / dashboards. */
  readonly testEnv: string;
  /** True when running inside GitHub Actions / CI. */
  readonly isCI: boolean;
  /** Optional credentials for authenticated journeys. */
  readonly testUserEmail: string | undefined;
  readonly testUserPassword: string | undefined;
}

/**
 * Safely parse an integer env var, falling back to `fallback` if missing or
 * non-numeric. Centralized so every consumer behaves identically.
 */
function parseIntEnv(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

/**
 * Parse a boolean env var. Treats `"true" | "1" | "yes"` (case-insensitive)
 * as true, everything else as false.
 */
function parseBoolEnv(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return ['true', '1', 'yes'].includes(value.toLowerCase());
}

/**
 * Singleton config object. Frozen so accidental mutation in a test does not
 * silently change behavior for subsequent tests.
 */
export const env: EnvConfig = Object.freeze({
  baseUrl: process.env.BASE_URL ?? 'https://www.brya.com',
  apiBaseUrl: process.env.API_BASE_URL ?? 'https://www.brya.com',
  defaultTimeout: parseIntEnv(process.env.DEFAULT_TIMEOUT, 30_000),
  navigationTimeout: parseIntEnv(process.env.NAVIGATION_TIMEOUT, 45_000),
  slowMo: parseIntEnv(process.env.SLOW_MO, 500),
  retries: parseIntEnv(process.env.RETRIES, 0),
  workers: process.env.WORKERS ? parseIntEnv(process.env.WORKERS, 1) : undefined,
  headed: parseBoolEnv(process.env.HEADED, false),
  testEnv: process.env.TEST_ENV ?? 'production',
  isCI: parseBoolEnv(process.env.CI, false),
  testUserEmail: process.env.TEST_USER_EMAIL || undefined,
  testUserPassword: process.env.TEST_USER_PASSWORD || undefined,
});
