import { test, expect, type Page } from "@playwright/test";
import { signInAsDemoLearner } from "./fixtures";

/**
 * Regression tests for the 4 defects captured in the Session 14 E2E
 * sweep (reports/qa-e2e-20260702/).
 *
 * Issues: #110, #111, #112, #113. Each test pins the fix so the
 * defect can't silently regress.
 *
 *   #110  ?next= ignored on /log-in → user lands on /dashboard
 *         instead of the deep-link they were trying to reach
 *   #111  No sign-out UI → users can't end their session on a
 *         shared device without dev-tools
 *   #112  Mobile AppNav overflows 375px → horizontal scroll on
 *         iPhone-sized viewports
 *   #113  No demo-mode banner → reviewers don't know mock-mode
 *         credentials are not validated
 */

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3001";

async function signOutViaUI(page: Page): Promise<void> {
  // The header AppNav has the sign-out control; click it and wait for
  // the navigation to /.
  const btn = page.getByRole("button", { name: /Sign out/ });
  await btn.first().click();
  await page.waitForURL(/\/$/);
}

test.describe("Regression — Session 14 E2E defects (issues #110–#113)", () => {
  test("#110 — /log-in honors ?next= param", async ({ page }) => {
    await page.goto(`${BASE}/log-in?next=/practice`);

    await page.getByLabel(/Email/).fill("test@example.com");
    await page.getByLabel(/Password/).fill("test-1");
    await page.getByRole("button", { name: /Log in/ }).click();

    // Should land on /practice, not /dashboard.
    await page.waitForURL(/\/practice$/, { timeout: 10000 });
    expect(page.url()).toMatch(/\/practice$/);
  });

  test("#110b — /log-in blocks open-redirect via ?next=https://evil.example.com", async ({ page }) => {
    await page.goto(`${BASE}/log-in?next=https://evil.example.com`);

    await page.getByLabel(/Email/).fill("test@example.com");
    await page.getByLabel(/Password/).fill("test-1");
    await page.getByRole("button", { name: /Log in/ }).click();

    // Should fall back to /dashboard, NOT to the attacker URL.
    await page.waitForURL(/\/dashboard$/, { timeout: 10000 });
    expect(page.url()).not.toMatch(/evil\.example\.com/);
  });

  test("#111 — sign-out control exists + clears session + returns to /", async ({ page }) => {
    await signInAsDemoLearner(page);
    await page.goto(`${BASE}/dashboard`);

    // Pre-condition: the auth cookie + localStorage entry are present.
    const cookies = await page.context().cookies(BASE);
    const authCookie = cookies.find((c) => c.name === "portuguese-teacher:auth");
    expect(authCookie, "auth cookie should be set after sign-in").toBeDefined();
    const lsBefore = await page.evaluate(() =>
      window.localStorage.getItem("portuguese-teacher:user"),
    );
    expect(lsBefore, "localStorage user entry should be set").not.toBeNull();

    await signOutViaUI(page);

    // Post-condition: cookie cleared, localStorage cleared, URL is /.
    const cookiesAfter = await page.context().cookies(BASE);
    const authCookieAfter = cookiesAfter.find(
      (c) => c.name === "portuguese-teacher:auth" && c.value && c.value !== "",
    );
    expect(authCookieAfter, "auth cookie should be cleared after sign-out").toBeUndefined();
    const lsAfter = await page.evaluate(() =>
      window.localStorage.getItem("portuguese-teacher:user"),
    );
    expect(lsAfter, "localStorage user entry should be cleared after sign-out").toBeNull();
    expect(page.url()).toMatch(/\/$/);
  });

  test("#112 — AppNav fits within 375×812 viewport (no horizontal overflow)", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await signInAsDemoLearner(page);
    await page.goto(`${BASE}/practice`);

    const { scrollWidth, innerWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }));
    expect(scrollWidth, "AppNav overflow at 375px").toBeLessThanOrEqual(innerWidth);

    // The mobile menu toggle should exist (data-testid added in the fix).
    const toggle = page.getByTestId("appnav-mobile-toggle");
    await expect(toggle).toBeVisible();

    // Open the dropdown and confirm the four nav links + sign-out are present.
    await toggle.click();
    const menu = page.getByTestId("appnav-mobile-menu");
    await expect(menu).toBeVisible();
    await expect(menu.getByRole("link", { name: /^Dashboard$/ })).toBeVisible();
    await expect(menu.getByRole("link", { name: /^Practice$/ })).toBeVisible();
    await expect(menu.getByRole("link", { name: /^Review$/ })).toBeVisible();
    await expect(menu.getByRole("link", { name: /^Profile$/ })).toBeVisible();
    await expect(menu.getByRole("button", { name: /Sign out/ })).toBeVisible();
  });

  test("#113 — /log-in and /sign-up show the demo-mode banner when NEXT_PUBLIC_MOCK=1", async ({ page }) => {
    await page.goto(`${BASE}/log-in`);
    await expect(page.getByTestId("demo-mode-banner")).toBeVisible();
    await expect(page.getByTestId("demo-mode-banner")).toContainText(/Demo mode/);

    await page.goto(`${BASE}/sign-up`);
    await expect(page.getByTestId("demo-mode-banner")).toBeVisible();
    await expect(page.getByTestId("demo-mode-banner")).toContainText(/Credentials are not validated/);
  });
});