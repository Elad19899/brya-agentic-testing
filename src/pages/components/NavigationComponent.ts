/**
 * ─────────────────────────────────────────────────────────────────────────────
 * src/pages/components/NavigationComponent.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Reusable component for the global site header / navigation bar.
 *
 * Why a separate component?
 *   The same header appears on every page. Modeling it as a standalone POM
 *   component (composed into each page via `BasePage`) means a markup change
 *   in the header touches exactly one file — not every page object that
 *   happens to reference it. This is a textbook application of the
 *   "Composition over inheritance" principle.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Locator, Page, expect } from '@playwright/test';

export class NavigationComponent {
  constructor(private readonly page: Page) {}

  /** Root <nav>/<header> element. Tests use this to scope further queries. */
  get root(): Locator {
    return this.page.locator('header, nav[role="navigation"]').first();
  }

  /** Brand logo — clicking it should always navigate to `/`. */
  get logo(): Locator {
    return this.root.getByRole('link', { name: /brya|home/i }).first();
  }

  /** Mobile hamburger toggle (present below md breakpoint). */
  get mobileMenuToggle(): Locator {
    return this.root.getByRole('button', { name: /menu|navigation/i }).first();
  }

  /** Generic accessor for a named navigation link, e.g. `link('About')`. */
  link(name: string | RegExp): Locator {
    const matcher = typeof name === 'string' ? new RegExp(`^${name}$`, 'i') : name;
    return this.root.getByRole('link', { name: matcher });
  }

  /**
   * Open the mobile menu if the hamburger button is visible. No-op on
   * desktop viewports.
   */
  async openMobileMenuIfPresent(): Promise<void> {
    if (await this.mobileMenuToggle.isVisible().catch(() => false)) {
      await this.mobileMenuToggle.click();
    }
  }

  /** Navigate via the header link with the given visible name. */
  async navigateTo(name: string | RegExp): Promise<void> {
    await this.openMobileMenuIfPresent();
    await this.link(name).click();
  }

  /** Assert that the global navigation is present and visible. */
  async expectVisible(): Promise<void> {
    await expect(this.root).toBeVisible();
  }
}
