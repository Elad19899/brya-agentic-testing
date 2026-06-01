/**
 * ─────────────────────────────────────────────────────────────────────────────
 * tests/ui/contact.spec.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Coverage for the Contact page (`/contact/`).
 *
 * This is Brya's real conversion form — the "Contact" CTA on `/partners`
 * (and elsewhere) routes here. We exercise:
 *   - Page loads with the contact form
 *   - Form is rendered and reachable
 *   - Client-side validation: invalid emails are rejected
 *
 * Critical safety guard:
 *   We DO NOT submit the form against production unless the SUBMIT_CONTACT_FORM
 *   env var is explicitly set. Production submissions would notify the Brya
 *   business team for every CI run — unacceptable.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { test, expect } from '../../src/fixtures/test-fixtures';
import { buildContactInquiry, invalidEmails } from '../../src/utils/test-data';

const SUBMIT_LIVE = process.env.SUBMIT_CONTACT_FORM === 'true';

test.describe('Contact Page', () => {
  // Requests /contact/ and asserts a < 400 status.
  test('@regression /contact loads with success status', async ({ contactPage }) => {
    const response = await contactPage.goto();
    expect(response, 'Contact page returned no response').toBeTruthy();
    expect(response!.status()).toBeLessThan(400);
  });

  // Loads /contact/ and asserts the inquiry form is rendered and visible.
  // Validates: the conversion form is present for users to fill in.
  test('@regression contact form is visible', async ({ contactPage }) => {
    await contactPage.goto();
    await contactPage.expectFormVisible();
  });

  // Types malformed emails into the form, attempts submit, and checks the email
  // input is flagged invalid (HTML5 validity) each time.
  // Validates: client-side validation blocks bad email input before submission.
  test('@regression client-side rejects invalid email formats', async ({ contactPage, page }) => {
    await contactPage.goto();
    await contactPage.expectFormVisible();

    for (const bad of invalidEmails.slice(0, 2)) {
      await contactPage.emailInput.fill(bad);
      await contactPage.messageInput.fill('autotest');
      // Trigger validation by attempting to submit. We expect the HTML5
      // :invalid pseudo-class to apply to the email input.
      await contactPage.submitButton.click().catch(() => undefined);
      const isInvalid = await contactPage.emailInput.evaluate(
        (el) => (el as HTMLInputElement).validity?.valid === false
      );
      expect(isInvalid, `Form should reject malformed email: ${bad}`).toBeTruthy();
      await page.reload();
    }
  });

  // GATED behind SUBMIT_CONTACT_FORM=true: fills the form with generated data,
  // submits it for real, and asserts a success confirmation.
  // Validates: the end-to-end happy-path submission actually works (opt-in only,
  // to avoid spamming the Brya business team from CI).
  test('@regression valid submission flow', async ({ contactPage }) => {
    test.skip(!SUBMIT_LIVE, 'Live form submission disabled — set SUBMIT_CONTACT_FORM=true to enable');
    await contactPage.goto();

    const data = buildContactInquiry();
    await contactPage.fillInquiry(data);
    await contactPage.submitInquiry();
    await contactPage.expectSubmissionSuccess();
  });
});
