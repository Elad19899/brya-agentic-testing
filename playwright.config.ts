/**
 * ─────────────────────────────────────────────────────────────────────────────
 * playwright.config.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Root Playwright configuration.
 *
 * Architectural significance:
 *   - Defines the **projects** that separate UI tests (multi-browser, mobile)
 *     from API tests. CI references these project names directly, so the
 *     UI-vs-API job split lives here in code, not in YAML.
 *   - Wires up Allure as the reporter alongside the standard HTML/list ones,
 *     keeping local DX (terminal output, HTML) and CI dashboards (Allure)
 *     working from the same run.
 *   - All timeouts, retries, baseURL etc. read from `config/env.config.ts` —
 *     no magic numbers in this file.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { defineConfig, devices } from '@playwright/test';
import { env } from './config/env.config';

export default defineConfig({
  // Root directory for all test specs. Subfolders `ui/` and `api/` are matched
  // by the `testMatch` patterns inside each project below.
  testDir: './tests',

  // Global per-test timeout (a single test's full lifetime including hooks).
  timeout: 60_000,

  // Expect-level timeout — controls how long a single `expect(...)` polls.
  expect: {
    timeout: env.defaultTimeout,
  },

  // Run files in parallel; tests within a file remain serial unless marked.
  fullyParallel: true,

  // Fail the build on CI if `test.only` accidentally lands in main.
  forbidOnly: env.isCI,

  // Retries: 2 on CI to absorb network flake against the live site, 0 locally
  // so failures stay loud while developing.
  retries: env.isCI ? 2 : env.retries,

  // Workers: cap CI to 2 to be polite to the public site; local follows env.
  workers: env.isCI ? 2 : env.workers,

  // Reporters:
  //   - `list` for human-readable terminal output
  //   - `html` for the built-in Playwright report (great for local debugging)
  //   - `allure-playwright` for our richer CI dashboard
  //   - `junit` so GitHub Actions can surface failures in the PR summary
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    [
      'allure-playwright',
      {
        detail: true,
        outputFolder: 'allure-results',
        suiteTitle: true,
        environmentInfo: {
          framework: 'Playwright + TypeScript',
          environment: env.testEnv,
          baseUrl: env.baseUrl,
          node: process.version,
        },
      },
    ],
    ['junit', { outputFile: 'test-results/junit.xml' }],
  ],

  // Shared options applied to every project (overridable per-project below).
  use: {
    baseURL: env.baseUrl,
    actionTimeout: env.defaultTimeout,
    navigationTimeout: env.navigationTimeout,
    
    // Slow down each browser action by `env.slowMo` ms so a human can visually
    // follow a UI run (e.g. homepage → click "About"). Tunable via the SLOW_MO
    // env var; set SLOW_MO=0 for full-speed CI runs. Lives in the shared `use`
    // block so it applies uniformly across every browser (UI) project; the API
    // project launches no browser, so this is a no-op there.
    launchOptions: {
      slowMo: env.slowMo,
    },

    // Diagnostics: capture only what we need to debug a failure — keeping
    // artifact size sane in CI.
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',

    // Test against the live, HTTPS-only public site. We do not bypass TLS.
    ignoreHTTPSErrors: false,

    // Identify the framework in server logs — helps the brya.com ops team
    // distinguish synthetic test traffic from real users.
    extraHTTPHeaders: {
      'X-Test-Source': 'brya-automation-framework',
    },
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Projects: each project is an independently runnable suite. CI uses
  // `--project=<name>` to split UI vs API jobs.
  // ───────────────────────────────────────────────────────────────────────────
  projects: [
    // ── UI tests, desktop Chromium ────────────────────────────────────────
    {
      name: 'ui-chromium',
      testMatch: /tests\/ui\/.*\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },

    // ── UI tests, desktop Firefox ─────────────────────────────────────────
    {
      name: 'ui-firefox',
      testMatch: /tests\/ui\/.*\.spec\.ts/,
      use: { ...devices['Desktop Firefox'] },
    },

    // ── UI tests, desktop WebKit (Safari engine) ──────────────────────────
    {
      name: 'ui-webkit',
      testMatch: /tests\/ui\/.*\.spec\.ts/,
      use: { ...devices['Desktop Safari'] },
    },

    // ── UI tests, mobile viewport (Pixel 5 / mobile Chrome) ───────────────
    // Same specs, exercised at a mobile viewport + touch emulation so the
    // responsive layer is covered without a separate test tree.
    {
      name: 'ui-mobile',
      testMatch: /tests\/ui\/.*\.spec\.ts/,
      use: { ...devices['Pixel 5'] },
    },

    // ── API tests ────────────────────────────────────────────────────────
    // API tests do not launch a browser context — they use Playwright's
    // `request` fixture. Keeping them in a dedicated project means CI can
    // run them in parallel with the UI suite on cheaper runners.
    {
      name: 'api',
      testMatch: /tests\/api\/.*\.spec\.ts/,
      use: {
        baseURL: env.apiBaseUrl,
      },
    },
  ],

  // Folder for raw Playwright artifacts (traces, videos, screenshots).
  outputDir: 'test-results',
});
