/**
 * ─────────────────────────────────────────────────────────────────────────────
 * tests/ui/partners.spec.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Coverage for the Partners page (`/partners`).
 *
 * `/partners` is Brya's B2B *marketing* landing page — it pitches the
 * health-plan partnership program and routes interested partners to the
 * inquiry form via a "Contact" CTA. The form itself lives at `/contact/`;
 * its coverage is in `tests/ui/contact.spec.ts`.
 *
 * Here we verify the marketing surface loads and the CTA points at the
 * contact page.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { test, expect } from '../../src/fixtures/test-fixtures';

test.describe('Partners Page', () => {
  // Requests /partners and asserts a < 400 status.
  // Validates: the B2B partners landing page is reachable.
  test('@regression /partners loads with success status', async ({ partnersPage }) => {
    const response = await partnersPage.goto();
    expect(response, 'Partners page returned no response').toBeTruthy();
    expect(response!.status()).toBeLessThan(400);
  });

  // Loads /partners and asserts the partnership hero is rendered.
  // Validates: the marketing pitch is actually present, not just a 200.
  test('@regression partners hero is visible', async ({ partnersPage }) => {
    await partnersPage.goto();
    await partnersPage.expectHeroVisible();
  });

  // Asserts the "Contact" CTA links to /contact/, where the inquiry form lives.
  // Validates: the partner → inquiry conversion path is wired up.
  test('@regression contact CTA routes to the contact page', async ({ partnersPage, page }) => {
    await partnersPage.goto();
    await expect(partnersPage.contactCta).toBeVisible();
    await expect(partnersPage.contactCta).toHaveAttribute('href', /\/contact/);
  });
});
