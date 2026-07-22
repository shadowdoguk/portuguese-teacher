import { test, expect } from "@playwright/test";
import {
  signInAsDemoLearner,
  spoofUserAgent,
  CHROMIUM_UA,
  SAFARI_UA,
  FIREFOX_UA,
} from "./fixtures";

test.describe("Tier detection + degradation", () => {
  test("chromium user agent → Tier 1", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "UA spoofing requires Navigator.prototype override (chromium only)");
    await signInAsDemoLearner(page);
    await spoofUserAgent(page, CHROMIUM_UA);
    await page.goto("/practice");

    const badge = page.getByTestId("tier-badge");
    await expect(badge).toBeVisible();
    await expect(badge).toHaveAttribute("data-tier", "1");
    await expect(page.getByTestId("mic-button")).toBeVisible();
  });

  test("safari user agent → Tier 2", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "UA spoofing requires Navigator.prototype override (chromium only)");
    await signInAsDemoLearner(page);
    await spoofUserAgent(page, SAFARI_UA);
    await page.goto("/practice");

    const badge = page.getByTestId("tier-badge");
    await expect(badge).toBeVisible();
    await expect(badge).toHaveAttribute("data-tier", "2");
  });

  test("firefox user agent → Tier 3 (text fallback only)", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "UA spoofing requires Navigator.prototype override (chromium only)");
    await signInAsDemoLearner(page);
    await spoofUserAgent(page, FIREFOX_UA);
    await page.goto("/practice");

    const badge = page.getByTestId("tier-badge");
    await expect(badge).toBeVisible();
    await expect(badge).toHaveAttribute("data-tier", "3");

    await expect(page.getByTestId("mic-button")).toHaveCount(0);
    await expect(page.getByTestId("learner-utterance").first()).toBeVisible();
    await expect(page.getByTestId("send-turn").first()).toBeVisible();
  });

  test("Tier 3 text fallback completes a turn end-to-end", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "UA spoofing requires Navigator.prototype override (chromium only)");
    await signInAsDemoLearner(page);
    await spoofUserAgent(page, FIREFOX_UA);
    await page.goto("/practice");

    await expect(page.getByTestId("tier-badge")).toHaveAttribute("data-tier", "3");

    const session = page.getByTestId("practice-session");
    const utteranceBox = page.getByTestId("learner-utterance").first();
    const sendButton = page.getByTestId("send-turn").first();

    await utteranceBox.scrollIntoViewIfNeeded();
    await utteranceBox.fill("Olá");
    await sendButton.click();

    await expect(
      session.locator(
        '[data-testid^="teacher-bubble-turn-"]:not([data-testid$="-audio"]):not([data-testid$="-replay"])',
      ),
    ).toHaveCount(1, { timeout: 15_000 });
  });
});