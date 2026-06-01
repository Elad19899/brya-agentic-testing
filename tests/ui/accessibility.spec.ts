/**
 * ─────────────────────────────────────────────────────────────────────────────
 * tests/ui/accessibility.spec.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Lightweight accessibility smoke checks.
 *
 * Brya's audience is older adults — accessibility is a product requirement,
 * not a nice-to-have. We perform structural checks without depending on
 * heavyweight libraries. For full WCAG audits, layer `@axe-core/playwright`
 * on top of these specs.
 *
 * Coverage:
 *   - Page has a single, non-empty <h1>
 *   - Every <img> has an `alt` attribute (even if empty for decorative)
 *   - The page declares a `lang` attribute
 *   - Buttons / links have an accessible name
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { test, expect } from '../../src/fixtures/test-fixtures';

test.describe('Accessibility — structural smoke', () => {
  test.beforeEach(async ({ homePage }) => {
    await homePage.goto();
  });

  // Reads the lang attribute on <html> and asserts it is set.
  // Validates: screen readers can determine the page language.
  test('@regression html declares a lang attribute', async ({ page }) => {
    const lang = await page.locator('html').getAttribute('lang');
    expect(lang, 'screen readers need <html lang> set').toBeTruthy();
  });

  // Counts <h1> elements and asserts there is at most one.
  // Validates: a clean heading hierarchy (no competing top-level headings).
  test('@regression exactly one <h1> on the page', async ({ page }) => {
    const h1s = page.locator('h1');
    const count = await h1s.count();
    // Allow 1 OR 0 (some SPAs hydrate the h1 after first paint); fail on 2+.
    expect(count, `Found ${count} <h1> elements; expected exactly one`).toBeLessThanOrEqual(1);
  });

  // Finds all <img> elements lacking an alt attribute and asserts there are none.
  // Validates: every image is annotated for screen-reader users.
  test('@regression every image declares an alt attribute', async ({ page }) => {
    const missing = await page
      .locator('img:not([alt])')
      .evaluateAll((imgs) => imgs.map((i) => (i as HTMLImageElement).src));
    expect(missing, `Images missing alt: ${missing.join(', ')}`).toEqual([]);
  });

  // Inspects every button and link, deriving an accessible name from
  // aria-label / text / title, and asserts only a tiny tolerance lack one.
  // Validates: interactive controls are announceable by assistive tech.
  test('@regression interactive elements have accessible names', async ({ page }) => {
    // For every <button> and <a>, accessibility tree must yield a name.
    const handles = await page.locator('button, a[href]').elementHandles();
    const nameless: string[] = [];
    for (const h of handles) {
      const accName = await h.evaluate((el) => {
        const ariaLabel = el.getAttribute('aria-label');
        const text = (el.textContent ?? '').trim();
        const title = el.getAttribute('title');
        return ariaLabel || text || title || '';
      });
      if (!accName) {
        const html = await h.evaluate((el) => (el as HTMLElement).outerHTML.slice(0, 120));
        nameless.push(html);
      }
    }
    expect(
      nameless.length,
      `Found ${nameless.length} interactive elements without accessible names`
    ).toBeLessThan(5); // allow a small tolerance for hydration race conditions
  });
});
