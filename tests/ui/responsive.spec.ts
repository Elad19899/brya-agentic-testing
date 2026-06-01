/**
 * ─────────────────────────────────────────────────────────────────────────────
 * tests/ui/responsive.spec.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Responsive-design coverage.
 *
 * Brya targets a 50+ audience, many of whom use larger fonts and tablets.
 * Layout regressions at common breakpoints — text overflow, hidden CTAs,
 * unreadable nav — directly damage the brand. These tests sweep the three
 * canonical viewport classes and confirm the core elements are visible.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { test, expect } from '../../src/fixtures/test-fixtures';

const viewports = [
  { name: 'mobile-portrait', width: 375, height: 812 },
  { name: 'tablet-portrait', width: 768, height: 1024 },
  { name: 'desktop-1080p', width: 1920, height: 1080 },
];

// Parametrized per viewport: sets each canonical viewport size, loads the
// homepage, and asserts the nav, the tagline/heading, and the footer are all
// visible.
// Validates: core page elements survive at mobile, tablet, and desktop widths.
for (const vp of viewports) {
  test(`@regression renders correctly at ${vp.name} (${vp.width}x${vp.height})`, async ({
    page,
    homePage,
    navigation,
    footer,
  }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await homePage.goto();

    await navigation.expectVisible();
    await expect(homePage.tagline.or(homePage.heading)).toBeVisible();

    // The footer should always be reachable by scroll — flag silent removal.
    await footer.expectVisible();
  });
}

// Loads the homepage at each viewport and measures whether document scroll
// width exceeds the window's inner width.
// Validates: no element forces horizontal scrolling at any common breakpoint.
test('@regression no horizontal overflow at common viewports', async ({ page, homePage }) => {
  // Catch the classic responsive bug: an element wider than the viewport
  // causes horizontal scroll. We measure the document scroll width.
  for (const vp of viewports) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await homePage.goto();
    const overflowing = await page.evaluate(() =>
      document.documentElement.scrollWidth > window.innerWidth + 1
    );
    expect(overflowing, `Horizontal overflow at ${vp.name}`).toBeFalsy();
  }
});
