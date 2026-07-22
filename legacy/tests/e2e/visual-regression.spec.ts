import { test, expect } from "@playwright/test";
import { signInAsDemoLearner } from "./fixtures";

/**
 * Visual regression baselines for the dashboard, lesson, and practice
 * routes (FR-WEB-2 + issue #14 acceptance).
 *
 * Each project in the device matrix runs this spec. Playwright's
 * `toHaveScreenshot()` compares the rendered page against a baseline
 * snapshot stored under `tests/e2e/visual-regression.spec.ts-snapshots/`.
 *
 * The baseline snapshots are committed to git. The first time this spec
 * runs, Playwright auto-creates the baselines. Subsequent runs diff against
 * them and fail if the pixel-level diff exceeds the `maxDiffPixelRatio`
 * (1 % by default — tuned below per page for the responsive layouts).
 *
 * Acceptance: "Visual diffs surface unintended layout changes" (issue #14).
 */

const VISUAL_TOLERANCE = {
  dashboard: { maxDiffPixelRatio: 0.01 },
  lesson: { maxDiffPixelRatio: 0.01 },
  practice: { maxDiffPixelRatio: 0.01 },
  assess: { maxDiffPixelRatio: 0.01 },
  settings: { maxDiffPixelRatio: 0.01 },
} as const;

test.describe("Visual regression — core routes @visual (FR-WEB-2 / issue #14)", () => {
  test.beforeEach(async ({ page }) => {
    await signInAsDemoLearner(page);
  });

  test("dashboard renders consistently", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.locator("h1, h2").first()).toBeVisible();
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("dashboard.png", VISUAL_TOLERANCE.dashboard);
  });

  test("practice route renders consistently", async ({ page }) => {
    await page.goto("/practice");
    await expect(page.getByTestId("practice-session")).toBeVisible({ timeout: 15_000 });
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("practice.png", VISUAL_TOLERANCE.practice);
  });

  test("lesson route renders consistently", async ({ page }) => {
    await page.goto("/lesson/a0-1-l1-alfabeto");
    await expect(page.locator("h1, h2").first()).toBeVisible();
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("lesson.png", VISUAL_TOLERANCE.lesson);
  });

  test("milestone assessment route renders consistently", async ({ page }) => {
    await page.goto("/assess/A0-A1");
    await expect(page.locator("h1, h2").first()).toBeVisible();
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("assess.png", VISUAL_TOLERANCE.assess);
  });

  test("settings route renders consistently (privacy panel + SC-5 status)", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByTestId("sc5-status")).toBeVisible({ timeout: 10_000 });
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("settings.png", VISUAL_TOLERANCE.settings);
  });
});