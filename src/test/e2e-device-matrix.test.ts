import { describe, expect, it } from "vitest";
import { devices } from "@playwright/test";

/**
 * Pins the device matrix declared in `playwright.config.ts` (FR-WEB-2 +
 * issue #14 acceptance).
 *
 * The matrix must cover the three FR-WEB-2 buckets (desktop / tablet / mobile)
 * across Chromium / WebKit / Firefox / Edge. Each profile is a Playwright
 * `devices` key. If a future change drops or renames a device, this test
 * fails so the matrix never silently shrinks.
 */

const REQUIRED_DESKTOP_PROFILES = [
  "Desktop Chrome",
  "Desktop Chrome HiDPI",
  "Desktop Edge HiDPI",
  "Desktop Safari",
  "Desktop Firefox",
  "Desktop Firefox HiDPI",
] as const;

const REQUIRED_TABLET_PROFILES = [
  "iPad (gen 11)",
  "Galaxy Tab S4",
] as const;

const REQUIRED_MOBILE_PROFILES = [
  "iPhone 15",
  "Pixel 7",
] as const;

describe("Cross-device matrix — FR-WEB-2 / issue #14", () => {
  it("every desktop profile referenced by playwright.config.ts is available", () => {
    for (const profile of REQUIRED_DESKTOP_PROFILES) {
      expect(devices[profile], `Playwright devices["${profile}"]`).toBeDefined();
    }
  });

  it("every tablet profile referenced by playwright.config.ts is available", () => {
    for (const profile of REQUIRED_TABLET_PROFILES) {
      expect(devices[profile], `Playwright devices["${profile}"]`).toBeDefined();
    }
  });

  it("every mobile profile referenced by playwright.config.ts is available", () => {
    for (const profile of REQUIRED_MOBILE_PROFILES) {
      expect(devices[profile], `Playwright devices["${profile}"]`).toBeDefined();
    }
  });

  it("every device profile includes viewport + userAgent + isMobile flags", () => {
    for (const profile of [
      ...REQUIRED_DESKTOP_PROFILES,
      ...REQUIRED_TABLET_PROFILES,
      ...REQUIRED_MOBILE_PROFILES,
    ]) {
      const d = devices[profile];
      expect(d).toBeDefined();
      expect(d.viewport, `${profile}.viewport`).toBeDefined();
      expect(typeof d.userAgent).toBe("string");
      expect(typeof d.isMobile).toBe("boolean");
      expect(typeof d.hasTouch).toBe("boolean");
    }
  });

  it("tablet + mobile profiles are mobile (isMobile=true)", () => {
    for (const profile of [...REQUIRED_TABLET_PROFILES, ...REQUIRED_MOBILE_PROFILES]) {
      const d = devices[profile];
      expect(d.isMobile, `${profile}.isMobile`).toBe(true);
    }
  });

  it("desktop profiles are not mobile (isMobile=false)", () => {
    for (const profile of REQUIRED_DESKTOP_PROFILES) {
      const d = devices[profile];
      expect(d.isMobile, `${profile}.isMobile`).toBe(false);
    }
  });
});