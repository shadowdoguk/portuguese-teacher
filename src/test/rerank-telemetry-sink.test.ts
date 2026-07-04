// Issue #106-4: the rerank orchestrator builds a `RerankTelemetry` object
// (tier, scoredCandidatesCount, chosenIndex, chosenScore, chosenUtterance,
// latencyMs, mock) and the route currently only logs it via console.info.
// The ObservabilityEvent union has no voice_loop_rerank_telemetry variant,
// so the diagnostic — which candidate won, what its score gap was — is
// invisible to the SLI dashboard.
//
// These tests pin the contract: the sink union accepts the new variant,
// the sink emits it on route calls, and the emit payload carries every
// field the orchestrator builds.

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  setObservabilitySink,
  resetObservabilitySink,
} from "@/lib/observability/sink";

beforeEach(() => {
  resetObservabilitySink();
});

describe("ObservabilitySink — voice_loop_rerank_telemetry variant (issue #106-4)", () => {
  it("the sink union accepts a voice_loop_rerank_telemetry event", async () => {
    const stubSink = {
      name: "stub",
      emit: vi.fn(),
      flush: vi.fn(async () => {}),
    };
    setObservabilitySink(stubSink);

    // Import after stubSink is wired so the route uses the stub.
    const { getObservabilitySink } = await import("@/lib/observability/sink");
    const sink = getObservabilitySink();

    // The discriminant + payload must round-trip through `emit` without
    // throwing a TS error at the call site. The test below is at runtime;
    // type-correctness is verified by tsc --noEmit.
    sink.emit({
      kind: "voice_loop_rerank_telemetry",
      occurredAt: 1_700_000_000_000,
      tier: 1,
      scoredCandidatesCount: 3,
      chosenIndex: 1,
      chosenScore: 0.85,
      chosenUtterance: "Olá, tudo bem?",
      latencyMs: 230,
      mock: false,
    });

    expect(stubSink.emit).toHaveBeenCalledTimes(1);
    const event = stubSink.emit.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(event.kind).toBe("voice_loop_rerank_telemetry");
    expect(event.tier).toBe(1);
    expect(event.scoredCandidatesCount).toBe(3);
    expect(event.chosenIndex).toBe(1);
    expect(event.chosenScore).toBe(0.85);
    expect(event.chosenUtterance).toBe("Olá, tudo bem?");
    expect(event.latencyMs).toBe(230);
    expect(event.mock).toBe(false);
  });
});

describe("/api/voice-loop/turn — rerank path emits telemetry to the sink", () => {
  const ORIGINAL_MOCK = process.env.NEXT_PUBLIC_MOCK;
  const ORIGINAL_RERANK = process.env.ENABLE_RERANK_PATH;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_MOCK = "1";
    process.env.ENABLE_RERANK_PATH = "1";
  });

  // Teardown handled in the parent describe block; restore env vars per test.

  it("rerank path emits one voice_loop_rerank_telemetry event to the sink", async () => {
    const stubSink = {
      name: "stub",
      emit: vi.fn(),
      flush: vi.fn(async () => {}),
    };
    setObservabilitySink(stubSink);

    const routeModule = await import("@/app/api/voice-loop/turn/route");
    const voiceLoopTurn = routeModule.POST;
    const req = new Request("http://localhost/api/voice-loop/turn", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        learnerText: "olá",
        tier: 1,
        practiceMode: "free-form",
        difficultyTarget: 1.0,
        learnerLevel: "A0",
      }),
    });
    const res = await voiceLoopTurn(req);
    expect(res.status).toBe(200);

    const telemetryCalls = (stubSink.emit as ReturnType<typeof vi.fn>).mock.calls.filter(
      (call: unknown[]) => {
        const arg = call[0] as { kind?: string };
        return arg?.kind === "voice_loop_rerank_telemetry";
      },
    );
    expect(telemetryCalls.length).toBe(1);

    const event = telemetryCalls[0]?.[0] as Record<string, unknown>;
    expect(event.tier).toBe(1);
    expect(typeof event.scoredCandidatesCount).toBe("number");
    expect(typeof event.chosenScore).toBe("number");
    expect(typeof event.chosenUtterance).toBe("string");
    expect(typeof event.latencyMs).toBe("number");
    expect(event.mock).toBe(true);

    if (ORIGINAL_MOCK === undefined) delete process.env.NEXT_PUBLIC_MOCK;
    else process.env.NEXT_PUBLIC_MOCK = ORIGINAL_MOCK;
    if (ORIGINAL_RERANK === undefined) delete process.env.ENABLE_RERANK_PATH;
    else process.env.ENABLE_RERANK_PATH = ORIGINAL_RERANK;
  });
});