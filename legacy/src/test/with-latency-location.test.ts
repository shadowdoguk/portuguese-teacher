// Pins the relocation of withLatencyMetric from src/lib/minimax/types.ts
// to src/lib/observability/latency.ts (issue #106-1).
//
// The dependency arrow goes observability → MiniMax, not the other way
// around. An OpenTelemetry swap now touches one observability file,
// not four MiniMax files. Backward compat: the old import path
// (`from "@/lib/minimax/types"`) still re-exports the helper.

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("withLatencyMetric location (issue #106-1)", () => {
  it("the helper is defined in src/lib/observability/latency.ts", () => {
    const src = readFileSync(
      join(process.cwd(), "src/lib/observability/latency.ts"),
      "utf-8",
    );
    expect(src).toMatch(/export\s+(async\s+)?function\s+withLatencyMetric\b/);
  });

  it("src/lib/minimax/types.ts re-exports it (no behavior change for callers)", () => {
    const src = readFileSync(
      join(process.cwd(), "src/lib/minimax/types.ts"),
      "utf-8",
    );
    expect(src).toMatch(
      /export\s*\{\s*withLatencyMetric[^}]*\}\s*from\s*["']@\/lib\/observability\/latency["']/,
    );
    // The function is NOT defined locally anymore (only re-exported).
    expect(src).not.toMatch(/function\s+withLatencyMetric\b/);
  });

  it("the runtime export resolves to the same identity", async () => {
    const latencyMod = await import("@/lib/observability/latency");
    const typesMod = await import("@/lib/minimax/types");
    expect(typesMod.withLatencyMetric).toBe(latencyMod.withLatencyMetric);
  });
});