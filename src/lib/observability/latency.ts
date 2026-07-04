// Issue #106-1: withLatencyMetric was inverted — it lived in
// src/lib/minimax/types.ts which means the observability library is
// imported by MiniMax client wrappers. The dependency arrow goes the
// wrong way: MiniMax → observability. An OpenTelemetry swap touches
// four MiniMax files plus the type module instead of one observability
// file. This module is the new home for the latency helper.
//
// Backward compat: src/lib/minimax/types.ts re-exports everything from
// here so existing call sites continue to work without churn.

import { getObservabilitySink } from "./sink";
import type { LatencyStage } from "./sink";

export type LatencyLog = {
  type: "minimax_latency";
  endpoint: LatencyStage;
  durationMs: number;
  ok: boolean;
};

export type LatencySink = (entry: LatencyLog) => void;

const defaultLatencySink: LatencySink = (entry) => {
  // Issue #106-2: route ONLY through the active ObservabilitySink.
  // The active sink in default mode (consoleObservabilitySink) emits
  // the JSON line itself — no double-write.
  getObservabilitySink().emit({
    kind: "voice_loop_latency",
    occurredAt: Date.now(),
    stage: entry.endpoint,
    latencyMs: entry.durationMs,
    ok: entry.ok,
  });
};

export async function withLatencyMetric<T>(
  endpoint: LatencyStage,
  fn: () => Promise<T>,
  sink: LatencySink = defaultLatencySink,
): Promise<T> {
  const start = performance.now();
  let ok = true;
  try {
    return await fn();
  } catch (error) {
    ok = false;
    throw error;
  } finally {
    const durationMs = Math.round(performance.now() - start);
    sink({ type: "minimax_latency", endpoint, durationMs, ok });
  }
}

export type { LatencyStage };