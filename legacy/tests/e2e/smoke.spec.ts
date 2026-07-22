import { test, expect } from "@playwright/test";
import { signInAsDemoLearner } from "./fixtures";

test.describe("Smoke — practice page renders on every supported browser", () => {
  test("practice page mounts in this browser", async ({ page }) => {
    await signInAsDemoLearner(page);
    await page.goto("/practice");

    await expect(page.getByTestId("practice-session")).toBeVisible();
    await expect(page.getByTestId("tier-badge")).toBeVisible();
  });
});