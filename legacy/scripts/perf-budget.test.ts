import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  buildBaseline,
  classifyRoute,
  findBudgetViolations,
  findRegressions,
  measureAllRoutes,
  measureRoute,
  PER_ROUTE_BUDGETS,
  type AppBuildManifest,
  type BundleBaseline,
} from "./perf-budget";

let workDir: string;
let staticDir: string;

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), "perf-budget-"));
  // .next/static/chunks/... — `staticDir` here is the .next/ root so the
  // script's `join(nextDir, "static/chunks/...")` resolves correctly.
  const nextRoot = join(workDir, ".next");
  staticDir = nextRoot;
  mkdirSync(join(nextRoot, "static", "chunks", "app", "(app)", "dashboard"), { recursive: true });
  mkdirSync(join(nextRoot, "static", "css"), { recursive: true });
  // static/chunks/webpack-shared.js (5kB) + static/chunks/main-app-shared.js (10kB)
  writeFileSync(join(nextRoot, "static", "chunks", "webpack-shared.js"), "x".repeat(5_000));
  writeFileSync(join(nextRoot, "static", "chunks", "main-app-shared.js"), "x".repeat(10_000));
  // static/chunks/app/page-public-page.js (12kB) — page-specific
  writeFileSync(
    join(nextRoot, "static", "chunks", "app", "page-public-page.js"),
    "x".repeat(12_000),
  );
  // static/chunks/app/(app)/dashboard/page-app-dashboard-page.js (8kB)
  writeFileSync(
    join(nextRoot, "static", "chunks", "app", "(app)", "dashboard", "page-app-dashboard-page.js"),
    "x".repeat(8_000),
  );
  // static/css/0e753bb055a4c21b.css (2kB)
  writeFileSync(join(nextRoot, "static", "css", "0e753bb055a4c21b.css"), "x".repeat(2_000));
});

afterEach(() => {
  rmSync(workDir, { recursive: true, force: true });
});

describe("classifyRoute", () => {
  it("maps the root /page to / in the public group", () => {
    expect(classifyRoute("/page")).toEqual({ group: "public", route: "/" });
  });

  it("maps /accessibility/page to /accessibility in the public group", () => {
    expect(classifyRoute("/accessibility/page")).toEqual({
      group: "public",
      route: "/accessibility",
    });
  });

  it("maps /(app)/dashboard/page to /dashboard in the app group", () => {
    expect(classifyRoute("/(app)/dashboard/page")).toEqual({
      group: "app",
      route: "/dashboard",
    });
  });

  it("maps /(auth)/log-in/page to /log-in in the auth group", () => {
    expect(classifyRoute("/(auth)/log-in/page")).toEqual({
      group: "auth",
      route: "/log-in",
    });
  });

  it("maps /(app)/lesson/[lessonId]/page to /lesson/[lessonId] in the app group", () => {
    expect(classifyRoute("/(app)/lesson/[lessonId]/page")).toEqual({
      group: "app",
      route: "/lesson/[lessonId]",
    });
  });

  it("returns null for an unknown manifest key", () => {
    expect(classifyRoute("/(app)/no-such-page")).toBeNull();
  });
});

describe("measureRoute", () => {
  it("returns null for an unclassified manifest key", () => {
    expect(
      measureRoute("/(app)/no-such-page", ["static/chunks/x.js"], staticDir, { gzip: false }),
    ).toBeNull();
  });

  it("sums JS chunks and CSS separately and tags shared chunks", () => {
    const m = measureRoute(
      "/page",
      [
        "static/chunks/webpack-shared.js",
        "static/chunks/main-app-shared.js",
        "static/chunks/app/page-public-page.js",
        "static/css/0e753bb055a4c21b.css",
      ],
      staticDir,
      { gzip: false },
    );

    expect(m).not.toBeNull();
    expect(m?.route).toBe("/");
    expect(m?.group).toBe("public");
    expect(m?.firstLoadJsBytes).toBe(5_000 + 10_000 + 12_000);
    expect(m?.firstLoadCssBytes).toBe(2_000);
    expect(m?.totalAssetsBytes).toBe(5_000 + 10_000 + 12_000 + 2_000);
    expect(m?.sharedChunkBytes).toBe(5_000 + 10_000);
  });

  it("reports zero for missing chunk files (so the build never lies about missing assets)", () => {
    const m = measureRoute(
      "/page",
      ["static/chunks/does-not-exist.js", "static/chunks/app/page-public-page.js"],
      staticDir,
      { gzip: false },
    );
    expect(m?.firstLoadJsBytes).toBe(12_000);
  });
});

describe("measureAllRoutes", () => {
  it("dedupes by route and keeps the heaviest matching entry", () => {
    const manifest: AppBuildManifest = {
      pages: {
        "/page": [
          "static/chunks/webpack-shared.js",
          "static/chunks/main-app-shared.js",
          "static/chunks/app/page-public-page.js",
          "static/css/0e753bb055a4c21b.css",
        ],
        "/(app)/dashboard/page": [
          "static/chunks/webpack-shared.js",
          "static/chunks/main-app-shared.js",
          "static/chunks/app/(app)/dashboard/page-app-dashboard-page.js",
          "static/css/0e753bb055a4c21b.css",
        ],
      },
    };

    const measurements = measureAllRoutes(manifest, staticDir, { gzip: false });
    expect(measurements.map((m) => m.route)).toEqual(["/", "/dashboard"]);
    expect(measurements[0]?.firstLoadJsBytes).toBe(27_000);
    expect(measurements[1]?.firstLoadJsBytes).toBe(23_000);
  });

  it("returns an empty list for an empty manifest", () => {
    expect(measureAllRoutes({ pages: {} }, staticDir, { gzip: false })).toEqual([]);
  });
});

describe("findBudgetViolations", () => {
  it("flags a route whose First Load JS exceeds the per-group budget", () => {
    const big = {
      route: "/practice",
      group: "app" as const,
      firstLoadJsBytes: PER_ROUTE_BUDGETS.app + 1_000,
      firstLoadCssBytes: 0,
      totalAssetsBytes: PER_ROUTE_BUDGETS.app + 1_000,
      sharedChunkBytes: 0,
    };
    expect(findBudgetViolations([big])).toEqual([
      {
        route: "/practice",
        metric: "firstLoadJsBytes",
        budget: PER_ROUTE_BUDGETS.app,
        actual: PER_ROUTE_BUDGETS.app + 1_000,
        ratio: (PER_ROUTE_BUDGETS.app + 1_000) / PER_ROUTE_BUDGETS.app,
      },
    ]);
  });

  it("passes when every route is under its budget", () => {
    const ok = {
      route: "/practice",
      group: "app" as const,
      firstLoadJsBytes: PER_ROUTE_BUDGETS.app - 1,
      firstLoadCssBytes: 0,
      totalAssetsBytes: PER_ROUTE_BUDGETS.app - 1,
      sharedChunkBytes: 0,
    };
    expect(findBudgetViolations([ok])).toEqual([]);
  });

  it("honours the smaller auth/public budgets", () => {
    const bigLogIn = {
      route: "/log-in",
      group: "auth" as const,
      firstLoadJsBytes: PER_ROUTE_BUDGETS.auth + 500,
      firstLoadCssBytes: 0,
      totalAssetsBytes: PER_ROUTE_BUDGETS.auth + 500,
      sharedChunkBytes: 0,
    };
    expect(findBudgetViolations([bigLogIn])[0]?.budget).toBe(PER_ROUTE_BUDGETS.auth);
  });
});

describe("findRegressions", () => {
  const baseline: BundleBaseline = {
    schemaVersion: 1,
    takenAt: "2026-01-01T00:00:00.000Z",
    buildId: "B1",
    entries: {
      "/dashboard": {
        firstLoadJsBytes: 100_000,
        firstLoadCssBytes: 2_000,
        totalAssetsBytes: 102_000,
      },
    },
  };

  it("flags regressions greater than 10 %", () => {
    const now = {
      route: "/dashboard",
      group: "app" as const,
      firstLoadJsBytes: 120_000,
      firstLoadCssBytes: 2_000,
      totalAssetsBytes: 122_000,
      sharedChunkBytes: 50_000,
    };
    const regressions = findRegressions([now], baseline, 0.1);
    expect(regressions).toHaveLength(2);
    expect(regressions[0]?.route).toBe("/dashboard");
    expect(regressions[0]?.metric).toBe("firstLoadJsBytes");
    expect(regressions[0]?.ratio).toBeCloseTo(0.2, 5);
  });

  it("passes when the change is within 10 %", () => {
    const now = {
      route: "/dashboard",
      group: "app" as const,
      firstLoadJsBytes: 105_000,
      firstLoadCssBytes: 2_000,
      totalAssetsBytes: 107_000,
      sharedChunkBytes: 50_000,
    };
    expect(findRegressions([now], baseline, 0.1)).toEqual([]);
  });

  it("passes when bytes went down (improvement)", () => {
    const now = {
      route: "/dashboard",
      group: "app" as const,
      firstLoadJsBytes: 50_000,
      firstLoadCssBytes: 1_000,
      totalAssetsBytes: 51_000,
      sharedChunkBytes: 25_000,
    };
    expect(findRegressions([now], baseline, 0.1)).toEqual([]);
  });

  it("ignores routes that are not in the baseline", () => {
    const now = {
      route: "/new-route",
      group: "app" as const,
      firstLoadJsBytes: 200_000,
      firstLoadCssBytes: 0,
      totalAssetsBytes: 200_000,
      sharedChunkBytes: 0,
    };
    expect(findRegressions([now], baseline, 0.1)).toEqual([]);
  });
});

describe("buildBaseline", () => {
  it("serialises measurements into a BundleBaseline snapshot", () => {
    const measurements = [
      {
        route: "/",
        group: "public" as const,
        firstLoadJsBytes: 27_000,
        firstLoadCssBytes: 2_000,
        totalAssetsBytes: 29_000,
        sharedChunkBytes: 15_000,
      },
    ];
    const baseline = buildBaseline(measurements, "BUILD-1", "2026-06-29T00:00:00.000Z");
    expect(baseline.schemaVersion).toBe(1);
    expect(baseline.buildId).toBe("BUILD-1");
    expect(baseline.takenAt).toBe("2026-06-29T00:00:00.000Z");
    expect(baseline.entries["/"]).toEqual({
      firstLoadJsBytes: 27_000,
      firstLoadCssBytes: 2_000,
      totalAssetsBytes: 29_000,
    });
  });
});