// Pins the health-snapshot consistency between the probe path
// (recordProbeHit) and the fallback path (emitDegradation). Issue #106-6.
//
// Both paths must:
//   1. Emit ObservabilityEvents with the same shape (`kind: "degradation"`)
//   2. Use the same `status: "recovered" | "down"` vocabulary for the
//      event payload
//   3. Record the same service status in `recordServiceStatus` for the
//      same input — both paths must converge on the same final state
//      ("ok" for a successful probe / recovered event, "down" for a
//      failed probe / down event)

import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  setObservabilitySink,
  resetObservabilitySink,
} from "@/lib/observability/sink";
import { recordProbeHit, getHealthSnapshot } from "@/lib/observability/health";

beforeEach(() => {
  resetObservabilitySink();
});

describe("Health snapshot — probe vs fallback consistency (issue #106-6)", () => {
  it("a successful probe records the service as 'ok' (matches emitDegradation mapping)", async () => {
    const events: { kind: string; status: string }[] = [];
    setObservabilitySink({
      name: "stub",
      emit: (e) => events.push({ kind: e.kind, status: e.status }),
      flush: async () => {},
    });

    const t0 = 1_700_000_000_000;
    recordProbeHit("llm", true, "eu-west-1", t0);

    // Event shape: kind=degradation, status=recovered (matches emitDegradation).
    expect(events).toEqual([
      { kind: "degradation", status: "recovered" },
    ]);
    // Health snapshot: service recorded as "ok" (the same final state
    // emitDegradation reaches via its `status === "recovered" ? "ok" : status` map).
    expect(getHealthSnapshot().services.llm.status).toBe("ok");
  });

  it("a failed probe records the service as 'down' (matches emitDegradation mapping)", async () => {
    const events: { kind: string; status: string }[] = [];
    setObservabilitySink({
      name: "stub",
      emit: (e) => events.push({ kind: e.kind, status: e.status }),
      flush: async () => {},
    });

    const t0 = 1_700_000_000_000;
    recordProbeHit("llm", false, "us-east-1", t0);

    expect(events).toEqual([
      { kind: "degradation", status: "down" },
    ]);
    expect(getHealthSnapshot().services.llm.status).toBe("down");
    expect(getHealthSnapshot().status).toBe("down");
  });

  it("recordProbeHit applies the 'recovered -> ok' mapping (source contract)", () => {
    const src = readFileSync(
      join(process.cwd(), "src/lib/observability/health.ts"),
      "utf-8",
    );
    // The fix: probe path uses the same "recovered -> ok" convention
    // that `emitDegradation` uses in src/lib/minimax/fallbacks.ts.
    expect(src).toMatch(/status\s*===\s*["']recovered["']\s*\?\s*["']ok["']\s*:\s*status/);
  });
});