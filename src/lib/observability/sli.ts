// Per-stage Voice Loop latency SLI aggregation.
//
// Pure functions; no I/O. Accepts an in-memory sample list + a query, returns
// the per-stage p50 / p95 / p99 over the requested window. The route handler
// pulls samples from the repository and passes them in.
//
// Formula reference (ADR-0002 §"Latency budget"):
//   p95 of the per-stage `client.total` events drives the 1.5 s breach alert.
//   p95 of each server-side stage (`asr`/`llm`/`tts`/`rerank`/`pronunciation`)
//     drives the per-stage "where is the budget going?" tile.
// `client.eos` + `client.upload` are surfaced separately so the browser-side
//   timing is visible alongside the server round-trip.

import type { LatencyStage } from "./sink";

export type LatencyWindowMs =
  | typeof LATENCY_WINDOWS["1h"]
  | typeof LATENCY_WINDOWS["24h"]
  | typeof LATENCY_WINDOWS["7d"];

export const LATENCY_WINDOWS = {
  "1h": 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
} as const;

export type LatencyWindowName = keyof typeof LATENCY_WINDOWS;

export type LatencySample = {
  stage: LatencyStage;
  latencyMs: number;
  occurredAt: number;
  ok: boolean;
  learnerId?: string;
  tier?: 1 | 2 | 3;
  practiceMode?: "free-form" | "scenario" | "drill";
};

export type SliSummary = {
  stage: LatencyStage;
  count: number;
  p50: number | null;
  p95: number | null;
  p99: number | null;
};

export type SliQuery = {
  samples: ReadonlyArray<LatencySample>;
  windowMs?: LatencyWindowMs;
  now?: number;
  stages?: ReadonlyArray<LatencyStage>;
  learnerId?: string;
  tier?: 1 | 2 | 3;
  practiceMode?: "free-form" | "scenario" | "drill";
};

/**
 * Linear-interpolation percentile (NIST / Excel PERCENTILE.INC). Accepts an
 * unsorted or partially sorted array; sorts a defensive copy. Returns null
 * for empty input. `p` is clamped to [0, 1].
 *
 * Index = (n - 1) * p; floor + ceil interpolated by the fractional gap.
 *   n=1 → 0
 *   n=2, p=0.5 → index 0.5 → mean(values[0], values[1])
 *   n=4, p=0.95 → index 2.85 → values[2] + 0.85 * (values[3] - values[2])
 */
export function percentile(values: ReadonlyArray<number>, p: number): number | null {
  if (values.length === 0) return null;
  const clamped = Math.max(0, Math.min(1, p));
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  if (n === 1) return sorted[0]!;
  const idx = (n - 1) * clamped;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo]!;
  const frac = idx - lo;
  const v0 = sorted[lo]!;
  const v1 = sorted[hi]!;
  return v0 + frac * (v1 - v0);
}

export function aggregateSli(query: SliQuery): ReadonlyArray<SliSummary> {
  const now = query.now ?? Date.now();
  const windowMs = query.windowMs ?? LATENCY_WINDOWS["1h"];
  const cutoff = now - windowMs;
  const stages = query.stages;

  // Pre-filter once (window + optional facet filters). The per-stage pass
  // then only iterates the buckets it cares about.
  const inWindow: LatencySample[] = [];
  for (const sample of query.samples) {
    if (sample.occurredAt < cutoff) continue;
    if (query.learnerId !== undefined && sample.learnerId !== query.learnerId) continue;
    if (query.tier !== undefined && sample.tier !== query.tier) continue;
    if (query.practiceMode !== undefined && sample.practiceMode !== query.practiceMode) continue;
    inWindow.push(sample);
  }

  // Bucket by stage. Missing stages emit a `{count: 0, p*: null}` row so the
  // dashboard renders a stable shape (no "stage missing" flicker).
  const buckets = new Map<LatencyStage, number[]>();
  for (const sample of inWindow) {
    if (!sample.ok) continue;
    let bucket = buckets.get(sample.stage);
    if (!bucket) {
      bucket = [];
      buckets.set(sample.stage, bucket);
    }
    bucket.push(sample.latencyMs);
  }

  const order: ReadonlyArray<LatencyStage> = stages ?? [
    "asr",
    "llm",
    "tts",
    "rerank",
    "pronunciation",
    "client.eos",
    "client.upload",
    "client.total",
  ];

  const out: SliSummary[] = [];
  for (const stage of order) {
    const values = buckets.get(stage) ?? [];
    out.push({
      stage,
      count: values.length,
      p50: percentile(values, 0.5),
      p95: percentile(values, 0.95),
      p99: percentile(values, 0.99),
    });
  }
  return out;
}

export type LatencyAlert = {
  breached: boolean;
  /** The p95 of the `client.total` stage over the alert window. */
  currentP95: number | null;
  /** How many samples fed the p95 (for "we need more data" gate). */
  sampleCount: number;
  /** Configured budget; surfaced so the dashboard can label the alert. */
  thresholdMs: number;
  /** Configured window; surfaced so the dashboard can label the alert. */
  windowMs: number;
  /** When the breach was first observed inside the window, or null. */
  firstBreachAt: number | null;
  /** When the breach was last observed inside the window, or null. */
  lastBreachAt: number | null;
};

export type LatencyAlertInput = {
  samples: ReadonlyArray<LatencySample>;
  /** p95 latency budget for end-of-speech → start-of-teacher-speech (ms). */
  thresholdMs?: number;
  /** Sliding window over which the alert is evaluated (ms). */
  windowMs?: number;
  now?: number;
};

export const DEFAULT_LATENCY_THRESHOLD_MS = 1500;
export const DEFAULT_ALERT_WINDOW_MS = 5 * 60 * 1000;
export const MIN_ALERT_SAMPLE_COUNT = 5;

/**
 * Evaluate the "p95 total latency > 1.5 s for > 5 min" alert (issue #36).
 *
 * The alert fires when, over the configured window, the `client.total`
 * p95 is strictly greater than the threshold. The "for > 5 min" framing
 * is satisfied by the window size: we report `firstBreachAt` so the
 * dashboard can show the breach has been ongoing for the entire window.
 *
 * To avoid noisy single-sample alerts, the evaluator requires at least
 * {@link MIN_ALERT_SAMPLE_COUNT} successful samples in the window.
 */
export function evaluateLatencyAlert(input: LatencyAlertInput): LatencyAlert {
  const now = input.now ?? Date.now();
  const thresholdMs = input.thresholdMs ?? DEFAULT_LATENCY_THRESHOLD_MS;
  const windowMs = input.windowMs ?? DEFAULT_ALERT_WINDOW_MS;
  const cutoff = now - windowMs;

  const values: number[] = [];
  let firstBreachAt: number | null = null;
  let lastBreachAt: number | null = null;
  for (const sample of input.samples) {
    if (sample.stage !== "client.total") continue;
    if (!sample.ok) continue;
    if (sample.occurredAt < cutoff) continue;
    values.push(sample.latencyMs);
    if (sample.latencyMs > thresholdMs) {
      if (firstBreachAt === null || sample.occurredAt < firstBreachAt) {
        firstBreachAt = sample.occurredAt;
      }
      if (lastBreachAt === null || sample.occurredAt > lastBreachAt) {
        lastBreachAt = sample.occurredAt;
      }
    }
  }

  const sampleCount = values.length;
  if (sampleCount < MIN_ALERT_SAMPLE_COUNT) {
    return {
      breached: false,
      currentP95: percentile(values, 0.95),
      sampleCount,
      thresholdMs,
      windowMs,
      firstBreachAt: null,
      lastBreachAt: null,
    };
  }

  const p95 = percentile(values, 0.95);
  const breached = p95 !== null && p95 > thresholdMs;
  return {
    breached,
    currentP95: p95,
    sampleCount,
    thresholdMs,
    windowMs,
    firstBreachAt,
    lastBreachAt,
  };
}