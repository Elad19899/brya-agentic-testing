/**
 * ─────────────────────────────────────────────────────────────────────────────
 * src/pages/ContactPage.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Page Object for the Contact page (`/contact/`).
 *
 * This is where Brya's contact / partner-inquiry form actually lives. The
 * `/partners` page is a pure marketing landing page — its "Contact" CTA links
 * here, and this form is the real B2B conversion channel. Every business
 * inquiry flows through it, so it gets first-class test coverage.
 *
 * Live form shape (as served by brya.com):
 *   - "Reason for Message" (text, required)
 *   - "Email Address"      (email, required)
 *   - "Message"            (textarea, required)
 *   - "Send Message"       (submit button)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Locator, Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export interface ContactInquiry {
  /** Free-text "Reason for Message" field. */
  reason: string;
  email: string;
  message: string;
}

export class ContactPage extends BasePage {
  protected readonly path = '/contact/';
  protected readonly pageName = 'Contact';

  constructor(page: Page) {
    super(page);
  }

  // ── Locators ─────────────────────────────────────────────────────────────

  /** The contact form element. */
  get contactForm(): Locator {
    return this.page.locator('form').first();
  }

  /** "Reason for Message" — the only field whose label contains "reason". */
  get reasonInput(): Locator {
    return this.page.getByLabel(/reason/i).first();
  }

  get emailInput(): Locator {
    return this.page.getByLabel(/email/i).first();
  }

  /**
   * "Message" textarea. We match the label exactly because "Reason for Message"
   * also contains the word "message" — a loose /message/i would be ambiguous.
   */
  get messageInput(): Locator {
    return this.page.getByLabel('Message', { exact: true });
  }

  get submitButton(): Locator {
    return this.page.getByRole('button', { name: /send message|submit|send/i }).first();
  }

  /** Success toast / confirmation rendered after a successful submit. */
  get successMessage(): Locator {
    return this.page
      .getByText(/thank you|received|we'?ll be in touch|message sent|got it/i)
      .first();
  }

  // ── Actions ──────────────────────────────────────────────────────────────

  /**
   * Fill the contact form. Submission is left to the caller so tests can assert
   * client-side validation without firing a real submission at the production
   * backend.
   */
  async fillInquiry(data: ContactInquiry): Promise<void> {
    await this.reasonInput.fill(data.reason);
    await this.emailInput.fill(data.email);
    await this.messageInput.fill(data.message);
  }

  async submitInquiry(): Promise<void> {
    await this.submitButton.click();
  }

  // ── Assertions ───────────────────────────────────────────────────────────

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/\/contact\/?/);
  }

  async expectFormVisible(): Promise<void> {
    await expect(this.contactForm).toBeVisible();
    await expect(this.emailInput).toBeVisible();
    await expect(this.messageInput).toBeVisible();
  }

  async expectSubmissionSuccess(): Promise<void> {
    await expect(this.successMessage).toBeVisible({ timeout: 15_000 });
  }
}
