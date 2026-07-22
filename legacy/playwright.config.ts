import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PORT ?? 3000);
const BASE_URL = `http://127.0.0.1:${PORT}`;

/**
 * Device matrix per FR-WEB-2 (issue #14):
 *
 * Desktop: Chrome (Win/macOS/Linux), Edge (Win), Safari (macOS), Firefox (Linux).
 * Tablet:  Safari iPad, Chrome Android tablet.
 * Mobile:  Safari iPhone 14+, Chrome Android 13+.
 *
 * The matrix is organised in three layers:
 *
 * 1. **Smoke projects** (`chromium`, `webkit`, `firefox-smoke`) — the
 *    PR-time fast path. Run on every PR via `pnpm test:e2e`. Fire up
 *    the in-memory mocks, drive the smoke flow, assert ≥ 6 E2E pass.
 *
 * 2. **Desktop matrix projects** (`desktop-chromium`,
 *    `desktop-webkit-full`, `desktop-firefox-full`,
 *    `desktop-edge`) — the full desktop matrix. `desktop-chromium`
 *    and `desktop-webkit-full` run the entire suite (smoke + visual
 *    regression + UA-spoof tier-degradation). `desktop-firefox-full`
 *    runs the full suite under Firefox Tier 3. `desktop-edge` is a
 *    best-effort project that gracefully no-ops if Microsoft Edge is
 *    not installed locally.
 *
 * 3. **Tablet + mobile projects** (`tablet-ipad`,
 *    `tablet-android-chrome`, `mobile-iphone`,
 *    `mobile-android-pixel`) — invoked by the nightly workflow
 *    (`.github/workflows/cross-device-smoke.yml`). Each project runs
 *    the smoke suite + visual regression on its device profile.
 *
 * The PR-time `e2e` CI job runs `--project=chromium --project=webkit
 * --project=firefox-smoke` (the fast path). The nightly workflow runs
 * every project.
 *
 * Visual regression baselines live in `tests/e2e/visual-regression.spec.ts`
 * and ship with committed screenshots in
 * `tests/e2e/visual-regression.spec.ts-snapshots/`.
 */
type DeviceMatrixProjectSpec = {
  name: string;
  description: string;
  scope: "smoke" | "matrix";
  use?: Record<string, unknown>;
  testMatch?: RegExp;
  browserName?: "chromium" | "webkit" | "firefox";
};

const DEVICE_MATRIX_PROJECTS: ReadonlyArray<DeviceMatrixProjectSpec> = [
  {
    name: "chromium",
    description: "PR-time smoke · Desktop Chrome (chromium)",
    use: { ...devices["Desktop Chrome"] },
    scope: "smoke",
  },
  {
    name: "webkit",
    description: "PR-time smoke · Desktop Safari (webkit)",
    use: { ...devices["Desktop Safari"] },
    scope: "smoke",
  },
  {
    name: "firefox-smoke",
    description: "PR-time smoke · Desktop Firefox (Tier 3 fallback)",
    use: { ...devices["Desktop Firefox"] },
    scope: "smoke",
    testMatch: /smoke(-suite)?\.spec\.ts$/,
  },
  {
    name: "desktop-chromium",
    description: "Nightly · Desktop Chrome (full suite)",
    use: { ...devices["Desktop Chrome HiDPI"] },
    scope: "matrix",
  },
  {
    name: "desktop-webkit-full",
    description: "Nightly · Desktop Safari (full suite)",
    use: { ...devices["Desktop Safari"] },
    scope: "matrix",
  },
  {
    name: "desktop-firefox-full",
    description: "Nightly · Desktop Firefox (full suite)",
    use: { ...devices["Desktop Firefox HiDPI"] },
    scope: "matrix",
  },
  {
    name: "desktop-edge",
    description: "Nightly · Desktop Edge (Win) — best-effort",
    use: { ...devices["Desktop Edge HiDPI"], channel: "msedge" },
    scope: "matrix",
  },
  {
    name: "tablet-ipad",
    description: "Nightly · Tablet — Safari iPad (gen 11)",
    use: { ...devices["iPad (gen 11)"] },
    scope: "matrix",
    browserName: "webkit",
  },
  {
    name: "tablet-android-chrome",
    description: "Nightly · Tablet — Chrome Android (Galaxy Tab S4)",
    use: { ...devices["Galaxy Tab S4"] },
    scope: "matrix",
    browserName: "chromium",
  },
  {
    name: "mobile-iphone",
    description: "Nightly · Mobile — Safari iPhone 15 (gen ≥ 14)",
    use: { ...devices["iPhone 15"] },
    scope: "matrix",
    browserName: "webkit",
  },
  {
    name: "mobile-android-pixel",
    description: "Nightly · Mobile — Chrome Android 13+ (Pixel 7)",
    use: { ...devices["Pixel 7"] },
    scope: "matrix",
    browserName: "chromium",
  },
];

function projectToPlaywright(p: DeviceMatrixProjectSpec): {
  name: string;
  use?: Record<string, unknown>;
  testMatch?: RegExp;
  browserName?: "chromium" | "webkit" | "firefox";
} {
  const out: {
    name: string;
    use?: Record<string, unknown>;
    testMatch?: RegExp;
    browserName?: "chromium" | "webkit" | "firefox";
  } = { name: p.name };
  if (p.use) out.use = p.use;
  if (p.testMatch) out.testMatch = p.testMatch;
  if (p.browserName) out.browserName = p.browserName;
  return out;
}

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["github"], ["list"]] : [["list"]],
  outputDir: "playwright-report",
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    video: "retain-on-failure",
    screenshot: "only-on-failure",
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
  },
  timeout: 90_000,
  expect: { timeout: 10_000 },
  projects: DEVICE_MATRIX_PROJECTS.map(projectToPlaywright),
  webServer: {
    command: `pnpm start --port ${PORT}`,
    url: BASE_URL,
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
    stdout: "pipe",
    stderr: "pipe",
    env: {
      NEXT_PUBLIC_MOCK: "1",
      PORT: String(PORT),
      DATABASE_URL: "file:./prisma/dev.db",
    },
  },
});