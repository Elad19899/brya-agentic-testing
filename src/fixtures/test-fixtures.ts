/**
 * ─────────────────────────────────────────────────────────────────────────────
 * src/fixtures/test-fixtures.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Custom Playwright fixtures.
 *
 * Architectural significance:
 *   - Fixtures are the canonical way to inject Page Objects into tests in
 *     Playwright. Wiring them up centrally means tests stay short and free of
 *     boilerplate (`new HomePage(page)` repeated everywhere).
 *   - We also expose component instances (Nav, Footer) and the API client as
 *     fixtures so any spec can pick exactly what it needs.
 *
 * Usage in tests:
 *   ```ts
 *   import { test, expect } from '@fixtures/test-fixtures';
 *   test('home loads', async ({ homePage }) => { ... });
 *   ```
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { test as base, expect } from '@playwright/test';
import { HomePage } from '../pages/HomePage';
import { AboutPage } from '../pages/AboutPage';
import { PartnersPage } from '../pages/PartnersPage';
import { ContactPage } from '../pages/ContactPage';
import { NavigationComponent } from '../pages/components/NavigationComponent';
import { FooterComponent } from '../pages/components/FooterComponent';
import { ApiClient } from '../api/ApiClient';

/**
 * Shape of every fixture injected into our tests. Adding a new POM? Add it
 * here, and tests that need it can destructure it from `test(...)`.
 */
export interface Fixtures {
  homePage: HomePage;
  aboutPage: AboutPage;
  partnersPage: PartnersPage;
  contactPage: ContactPage;
  navigation: NavigationComponent;
  footer: FooterComponent;
  apiClient: ApiClient;
}

export const test = base.extend<Fixtures>({
  // ── Browser lifecycle ──────────────────────────────────────────────────
  // By default Playwright's `browser` fixture is worker-scoped: a single
  // browser process is launched once per worker and reused across every test
  // in that worker (only the context/page are recreated per test). We override
  // it as a *test*-scoped fixture so a fresh browser is launched for each test
  // and fully closed in teardown. The built-in `context`/`page` fixtures still
  // build on top of this, so all `use` options (device emulation, viewport,
  // trace, video, screenshots, baseURL) continue to apply unchanged.
  browser: async ({ playwright, browserName, launchOptions }, use) => {
    const browser = await playwright[browserName].launch(launchOptions);
    await use(browser);
    await browser.close();
  },

  // ── Page-level fixtures ────────────────────────────────────────────────
  homePage: async ({ page }, use) => {
    await use(new HomePage(page));
  },
  aboutPage: async ({ page }, use) => {
    await use(new AboutPage(page));
  },
  partnersPage: async ({ page }, use) => {
    await use(new PartnersPage(page));
  },
  contactPage: async ({ page }, use) => {
    await use(new ContactPage(page));
  },

  // ── Component fixtures ─────────────────────────────────────────────────
  navigation: async ({ page }, use) => {
    await use(new NavigationComponent(page));
  },
  footer: async ({ page }, use) => {
    await use(new FooterComponent(page));
  },

  // ── API fixture ────────────────────────────────────────────────────────
  // The API client is fully torn down after the test, releasing its HTTP
  // context and any sockets it opened.
  apiClient: async ({}, use) => {
    const client = new ApiClient();
    await client.init();
    await use(client);
    await client.dispose();
  },
});

// Re-export `expect` so test files only need one import line.
export { expect };
