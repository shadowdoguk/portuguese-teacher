import { test, expect } from "@playwright/test";
import { signInAsDemoLearner, AUTHENTICATED_LHCI_ROUTES } from "./fixtures";

/**
 * Smoke that covers the LHCI authenticated run (ADR-0005 §2 —
 * "Authenticated LHCI runs for /dashboard, /review, /practice"). Each
 * route renders the main feature surface in <authenticated> state. The
 * `signInAsDemoLearner` fixture writes BOTH the auth cookie and the
 * per-Learner localStorage so the first navigation lands as
 * authenticated (no redirect-to-/log-in race — see fixture).
 */
test.describe("Authenticated smoke — LHCI run surfaces (ADR-0005 §2)", () => {
  for (const url of AUTHENTICATED_LHCI_ROUTES) {
    const path = url.replace("http://localhost:3000", "");
    test(`${path} renders authenticated content`, async ({ page }) => {
      await signInAsDemoLearner(page);
      await page.goto(path);

      // A quick smoke assertion: any nav link in the AppShell is the
      // clearest signal that the authenticated layout mounted.
      await expect(page.locator("nav, header").first()).toBeVisible();
    });
  }
});
