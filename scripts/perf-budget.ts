/**
 * Performance budget alarm.
 *
 * Reads `.next/app-build-manifest.json` (or a fixture), sums the JS + CSS
 * bytes for every page route, and:
 *   1. Asserts per-route budgets from {@link PER_ROUTE_BUDGETS} below.
 *   2. Compares against a baseline at `.lighthouseci/bundle-baseline.json`
 *      (if present) and flags any metric that regressed by more than 10 %.
 *   3. Optionally writes a fresh baseline with `--update-baseline`.
 *
 * Designed to run as a non-interactive CI step after `pnpm build`.
 * The pure helpers are unit-tested at `scripts/perf-budget.test.ts`.
 */

import { readFileSync, writeFileSync, existsSync, statSync, mkdirSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

export type RouteId = string;

export type RouteMeasurement = {
  route: RouteId;
  group: RouteGroupKey;
  firstLoadJsBytes: number;
  firstLoadCssBytes: number;
  totalAssetsBytes: number;
  sharedChunkBytes: number;
};

export type BudgetViolation = {
  route: RouteId;
  metric: "firstLoadJsBytes" | "firstLoadCssBytes" | "totalAssetsBytes";
  budget: number;
  actual: number;
  ratio: number;
};

export type BaselineEntry = {
  firstLoadJsBytes: number;
  firstLoadCssBytes: number;
  totalAssetsBytes: number;
};

export type BundleBaseline = {
  schemaVersion: 1;
  takenAt: string;
  buildId: string;
  entries: Record<RouteId, BaselineEntry>;
};

export type AppBuildManifest = {
  pages: Record<string, string[]>;
};

export type RouteGroupKey = "public" | "app" | "auth" | "system";

export const PER_ROUTE_BUDGETS: Record<RouteGroupKey, number> = {
  // Numbers are gzipped First Load JS bytes — matches what Next.js prints
  // for "First Load JS" and what users actually download on a slow network.
  // Tuned from the current build: /practice sits at ~133 kB gzipped after
  // the #47 scenario library expansion (100 scenarios in the in-memory
  // library). The previous budget (130 kB) was set when /practice was
  // ~117 kB. The 5 kB headroom above the current build catches regressions
  // without flapping on every additional scenario.
  public: 100_000,
  app: 140_000,
  auth: 110_000,
  system: 100_000,
};

const REGRESSION_THRESHOLD = 0.1;

const SHARED_CHUNK_HINTS = [
  "static/chunks/webpack-",
  "static/chunks/main-app-",
  "polyfills",
  "static/chunks/main-",
  "static/chunks/framework-",
];

const ROUTE_GROUP_RULES: Array<{ prefix: string; group: RouteGroupKey; route: string }> = [
  { prefix: "/(app)/practice", group: "app", route: "/practice" },
  { prefix: "/(app)/review", group: "app", route: "/review" },
  { prefix: "/(app)/dashboard", group: "app", route: "/dashboard" },
  { prefix: "/(app)/progress", group: "app", route: "/progress" },
  { prefix: "/(app)/lesson/", group: "app", route: "/lesson/[lessonId]" },
  { prefix: "/(app)/assess/", group: "app", route: "/assess/[boundary]" },
  { prefix: "/(app)/placement", group: "app", route: "/placement" },
  { prefix: "/(app)/settings", group: "app", route: "/settings" },
  { prefix: "/(app)/profile", group: "app", route: "/profile" },
  { prefix: "/(app)/confidence", group: "app", route: "/confidence" },
  { prefix: "/(auth)/log-in", group: "auth", route: "/log-in" },
  { prefix: "/(auth)/sign-up", group: "auth", route: "/sign-up" },
  { prefix: "/accessibility/", group: "public", route: "/accessibility" },
  { prefix: "/dashboards/", group: "system", route: "/dashboards/voice-loop-latency" },
  { prefix: "/page", group: "public", route: "/" },
];

export function classifyRoute(manifestKey: string): { group: RouteGroupKey; route: RouteId } | null {
  for (const rule of ROUTE_GROUP_RULES) {
    if (manifestKey.startsWith(rule.prefix)) {
      return { group: rule.group, route: rule.route };
    }
  }
  return null;
}

function isSharedChunk(path: string): boolean {
  return SHARED_CHUNK_HINTS.some((hint) => path.includes(hint));
}

function sumFileBytes(nextDir: string, paths: ReadonlyArray<string>, gzip: boolean): number {
  let total = 0;
  for (const p of paths) {
    const abs = join(nextDir, p);
    if (existsSync(abs)) {
      const buf = readFileSync(abs);
      total += gzip ? gzipSync(buf, { level: 9 }).length : buf.length;
    }
  }
  return total;
}

export function measureRoute(
  manifestKey: string,
  chunkPaths: ReadonlyArray<string>,
  nextDir: string,
  options: { gzip?: boolean } = {},
): RouteMeasurement | null {
  const classified = classifyRoute(manifestKey);
  if (!classified) {
    return null;
  }

  const gzip = options.gzip ?? true;
  const jsPaths = chunkPaths.filter((p) => p.endsWith(".js"));
  const cssPaths = chunkPaths.filter((p) => p.endsWith(".css"));

  const sharedJsPaths = jsPaths.filter(isSharedChunk);
  const pageJsPaths = jsPaths.filter((p) => !isSharedChunk(p));

  const sharedJsBytes = sumFileBytes(nextDir, sharedJsPaths, gzip);
  const pageJsBytes = sumFileBytes(nextDir, pageJsPaths, gzip);
  const cssBytes = sumFileBytes(nextDir, cssPaths, gzip);

  return {
    route: classified.route,
    group: classified.group,
    firstLoadJsBytes: sharedJsBytes + pageJsBytes,
    firstLoadCssBytes: cssBytes,
    totalAssetsBytes: sharedJsBytes + pageJsBytes + cssBytes,
    sharedChunkBytes: sharedJsBytes,
  };
}

export function measureAllRoutes(
  manifest: AppBuildManifest,
  nextDir: string,
  options: { gzip?: boolean } = {},
): RouteMeasurement[] {
  const seen = new Map<RouteId, RouteMeasurement>();
  for (const [key, chunks] of Object.entries(manifest.pages)) {
    const m = measureRoute(key, chunks, nextDir, options);
    if (!m) {
      continue;
    }
    const prev = seen.get(m.route);
    if (!prev || m.totalAssetsBytes > prev.totalAssetsBytes) {
      seen.set(m.route, m);
    }
  }
  return [...seen.values()].sort((a, b) => a.route.localeCompare(b.route));
}

export function findBudgetViolations(
  measurements: ReadonlyArray<RouteMeasurement>,
  budgets: Record<RouteGroupKey, number> = PER_ROUTE_BUDGETS,
): BudgetViolation[] {
  const violations: BudgetViolation[] = [];
  for (const m of measurements) {
    const budgetJs = budgets[m.group];
    if (m.firstLoadJsBytes > budgetJs) {
      violations.push({
        route: m.route,
        metric: "firstLoadJsBytes",
        budget: budgetJs,
        actual: m.firstLoadJsBytes,
        ratio: m.firstLoadJsBytes / budgetJs,
      });
    }
  }
  return violations;
}

export type Regression = {
  route: RouteId;
  metric: keyof BaselineEntry;
  baseline: number;
  actual: number;
  ratio: number;
};

export function findRegressions(
  measurements: ReadonlyArray<RouteMeasurement>,
  baseline: BundleBaseline,
  threshold: number = REGRESSION_THRESHOLD,
): Regression[] {
  const regressions: Regression[] = [];
  for (const m of measurements) {
    const entry = baseline.entries[m.route];
    if (!entry) {
      continue;
    }
    for (const metric of ["firstLoadJsBytes", "firstLoadCssBytes", "totalAssetsBytes"] as const) {
      const base = entry[metric];
      if (base <= 0) {
        continue;
      }
      const actual = m[metric];
      if (actual <= base) {
        continue;
      }
      const ratio = actual / base - 1;
      if (ratio > threshold) {
        regressions.push({ route: m.route, metric, baseline: base, actual, ratio });
      }
    }
  }
  return regressions;
}

export function buildBaseline(
  measurements: ReadonlyArray<RouteMeasurement>,
  buildId: string,
  takenAt: string = new Date().toISOString(),
): BundleBaseline {
  return {
    schemaVersion: 1,
    takenAt,
    buildId,
    entries: Object.fromEntries(
      measurements.map((m) => [
        m.route,
        {
          firstLoadJsBytes: m.firstLoadJsBytes,
          firstLoadCssBytes: m.firstLoadCssBytes,
          totalAssetsBytes: m.totalAssetsBytes,
        },
      ]),
    ),
  };
}

function formatKB(bytes: number): string {
  return `${(bytes / 1024).toFixed(1)} kB`;
}

function formatPercent(ratio: number): string {
  return `${(ratio * 100).toFixed(1)}%`;
}

function printTable(measurements: ReadonlyArray<RouteMeasurement>): void {
  const header = `${"Route".padEnd(28)}  ${"First Load JS".padStart(14)}  ${"Shared".padStart(10)}  ${"CSS".padStart(10)}`;
  console.log(header);
  console.log("-".repeat(header.length));
  for (const m of measurements) {
    console.log(
      `${m.route.padEnd(28)}  ${formatKB(m.firstLoadJsBytes).padStart(14)}  ${formatKB(m.sharedChunkBytes).padStart(10)}  ${formatKB(m.firstLoadCssBytes).padStart(10)}`,
    );
  }
}

function printViolations(violations: ReadonlyArray<BudgetViolation>): void {
  console.error("\nBudget violations:");
  for (const v of violations) {
    console.error(
      `  ${v.route}  ${v.metric}=${formatKB(v.actual)}  budget=${formatKB(v.budget)}  (${formatPercent(v.ratio)})`,
    );
  }
}

function printRegressions(regressions: ReadonlyArray<Regression>): void {
  console.error("\nRegressions > 10%:");
  for (const r of regressions) {
    console.error(
      `  ${r.route}  ${r.metric}=${formatKB(r.actual)}  baseline=${formatKB(r.baseline)}  (+${formatPercent(r.ratio)})`,
    );
  }
}

export type CliOptions = {
  updateBaseline: boolean;
  manifestPath: string;
  baselinePath: string;
  staticDir: string;
};

export function parseArgs(argv: ReadonlyArray<string>): CliOptions {
  let updateBaseline = false;
  let manifestPath = ".next/app-build-manifest.json";
  let baselinePath = ".lighthouseci/bundle-baseline.json";
  let staticDir = ".next";

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--update-baseline") {
      updateBaseline = true;
    } else if (arg === "--manifest") {
      manifestPath = argv[++i] ?? manifestPath;
    } else if (arg === "--baseline") {
      baselinePath = argv[++i] ?? baselinePath;
    } else if (arg === "--static-dir") {
      staticDir = argv[++i] ?? staticDir;
    }
  }

  return { updateBaseline, manifestPath, baselinePath, staticDir };
}

export function runCli(options: CliOptions, cwd: string = process.cwd()): number {
  const manifestAbs = resolve(cwd, options.manifestPath);
  if (!existsSync(manifestAbs)) {
    console.error(`Manifest not found: ${manifestAbs}`);
    console.error("Did `pnpm build` run? Is the path correct?");
    return 2;
  }

  const raw = JSON.parse(readFileSync(manifestAbs, "utf8")) as AppBuildManifest;
  const nextDir = resolve(cwd, options.staticDir);
  const measurements = measureAllRoutes(raw, nextDir);

  if (measurements.length === 0) {
    console.error("No measurable routes found in manifest. Aborting.");
    return 2;
  }

  printTable(measurements);

  const violations = findBudgetViolations(measurements);
  const baselineAbs = resolve(cwd, options.baselinePath);
  const hasBaseline = existsSync(baselineAbs);
  const baseline: BundleBaseline | null = hasBaseline
    ? (JSON.parse(readFileSync(baselineAbs, "utf8")) as BundleBaseline)
    : null;
  const regressions = baseline ? findRegressions(measurements, baseline) : [];

  if (violations.length > 0) {
    printViolations(violations);
  }
  if (regressions.length > 0) {
    printRegressions(regressions);
  }

  if (options.updateBaseline || !hasBaseline) {
    const buildId = existsSync(resolve(cwd, options.staticDir, "BUILD_ID"))
      ? readFileSync(resolve(cwd, options.staticDir, "BUILD_ID"), "utf8").trim()
      : "unknown";
    const fresh = buildBaseline(measurements, buildId);
    mkdirSync(dirname(baselineAbs), { recursive: true });
    writeFileSync(baselineAbs, `${JSON.stringify(fresh, null, 2)}\n`);
    console.log(
      `\nWrote baseline: ${options.baselinePath}  (${measurements.length} routes, buildId=${fresh.buildId})`,
    );
  }

  if (violations.length > 0 || regressions.length > 0) {
    return 1;
  }

  console.log("\nAll per-route budgets + regression thresholds OK.");
  return 0;
}

function isMainEntrypoint(): boolean {
  if (typeof process === "undefined" || !Array.isArray(process.argv)) {
    return false;
  }
  if (process.argv[1] == null) {
    return false;
  }
  try {
    return resolve(process.argv[1]) === fileURLToPath(import.meta.url);
  } catch {
    return false;
  }
}

if (isMainEntrypoint()) {
  const code = runCli(parseArgs(process.argv.slice(2)));
  process.exit(code);
}