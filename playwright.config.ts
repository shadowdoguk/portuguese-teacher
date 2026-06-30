import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PORT ?? 3000);
const BASE_URL = `http://127.0.0.1:${PORT}`;

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
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
    {
      name: "firefox-smoke",
      // Firefox is the Tier 3 (text-only) path per FR-WEB-2; smoke-only to
      // keep CI fast — the Tier 3 assertions live in chromium-with-UA-spoof
      // test cases that run in the chromium project.
      testMatch: /smoke\.spec\.ts$/,
      use: { ...devices["Desktop Firefox"] },
    },
  ],
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