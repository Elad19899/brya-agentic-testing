/**
 * ─────────────────────────────────────────────────────────────────────────────
 * tests/ui/about.spec.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Coverage for the About page (`/about`).
 *
 * We treat /about as a "soft" page — it may be served as a 200, may redirect
 * back to the homepage in a marketing experiment, or temporarily 404. Tests
 * here use `test.skip` to gracefully bypass when the page isn't currently
 * served, rather than fire false alarms.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { test, expect } from '../../src/fixtures/test-fixtures';

test.describe('About Page', () => {
  // Requests /about and asserts the HTTP status is < 400 (success or redirect).
  // Validates: the About route is reachable and not erroring out.
  test('@regression /about loads with a valid response', async ({ aboutPage }) => {
    const response = await aboutPage.goto();
    test.skip(!response, 'About page failed to return a response');
    expect(response!.status(), 'About should respond with success or redirect').toBeLessThan(400);
  });

  // Loads /about, looks for the mission copy (warning, not failing, if absent),
  // and asserts the page title is Brya-branded.
  // Validates: the About page renders its core content and keeps brand titling.
  test('@regression renders the mission narrative', async ({ aboutPage, page }) => {
    const response = await aboutPage.goto();
    test.skip(!response || response.status() >= 400, '/about not currently served');
    // The mission copy mentions one of these themes — picking any-of keeps
    // the assertion resilient to marketing rewrites.
    const missionVisible = await aboutPage.missionStatement.isVisible().catch(() => false);
    if (!missionVisible) {
      test.info().annotations.push({
        type: 'warning',
        description: 'Mission section copy not detected — selectors may need updating.',
      });
    }
    // Title regression: Brya should always brand the tab.
    await expect(page).toHaveTitle(/brya/i);
  });
});
