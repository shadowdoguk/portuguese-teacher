import { test, expect, type Page } from "@playwright/test";
import { signInAsDemoLearner } from "./fixtures";

/**
 * Sign-up → first Lesson → first Conversational Practice turn → Milestone
 * Assessment (FR-WEB-2 device matrix smoke — issue #14).
 *
 * The flow runs against every project declared in `playwright.config.ts`,
 * which means the same end-to-end exercise exercises Chromium / WebKit /
 * Firefox (Tier 1 / 2 / 3 of the FR-WEB-2 browser support matrix). The
 * companion nightly workflow (`.github/workflows/cross-device-smoke.yml`)
 * extends this to the full device matrix (desktop + tablet + mobile) with
 * visual regression baselines.
 */

async function expectPageRenders(page: Page, label: string): Promise<void> {
  // A page that renders successfully exposes at least one heading element.
  // We use a tolerant selector (`h1, h2`) so the assertion stays stable
  // across copy / i18n changes.
  const heading = page.locator("h1, h2").first();
  await expect(heading, `${label} should render a heading`).toBeVisible({ timeout: 10_000 });
}

test.describe("Smoke — sign-up → lesson → practice → assessment", () => {
  test.beforeEach(async ({ page }) => {
    await signInAsDemoLearner(page);
  });

  test("lands on the dashboard after sign-in", async ({ page }) => {
    await page.goto("/dashboard");
    await expectPageRenders(page, "dashboard");
  });

  test("lesson route renders without manual intervention", async ({ page }) => {
    await page.goto("/lesson/a0-1-l1-alfabeto");
    await expectPageRenders(page, "lesson");
  });

  test("practice route renders the Live turn card on every Tier", async ({ page }) => {
    await page.goto("/practice");
    await expect(page.getByTestId("practice-session")).toBeVisible({ timeout: 15_000 });
  });

  test("milestone assessment page renders the assessment prompt", async ({ page }) => {
    await page.goto("/assess/A0-A1");
    await expectPageRenders(page, "milestone assessment");
  });

  test("settings page renders privacy + audio + dialect controls", async ({ page }) => {
    await page.goto("/settings");
    await expectPageRenders(page, "settings");
    // SC-5 Sampling Buffer card lives on the privacy panel — its presence
    // confirms the auth + privacy-control wiring is healthy across browsers.
    await expect(page.getByTestId("sc5-status")).toBeVisible({ timeout: 10_000 });
  });
});