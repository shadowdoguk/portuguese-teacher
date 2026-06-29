import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as getHealth } from "@/app/api/health/route";
import {
  getHealthSnapshot,
  getServiceAvailability,
  recordProbeHit,
  recordServiceStatus,
  resetHealthStateForTests,
} from "@/lib/observability/health";
import {
  consoleObservabilitySink,
  resetObservabilitySink,
} from "@/lib/observability/sink";
import {
  withAsrFallback,
  withLlmFallback,
  withTtsFallback,
  type AsrTranscriber,
  type LlmCompleter,
  type TtsSynthesizer,
} from "@/lib/minimax/fallbacks";
import {
  MiniMaxError,
  type AsrTranscribeResult,
  type LlmCompleteResult,
  type TtsSynthesizeResult,
} from "@/lib/minimax/types";

beforeEach(() => {
  resetHealthStateForTests();
  resetObservabilitySink();
});

afterEach(() => {
  resetHealthStateForTests();
  resetObservabilitySink();
});

describe("withAsrFallback", () => {
  it("returns the primary result when the call succeeds", async () => {
    const expected: AsrTranscribeResult = {
      text: "ol\u00e1",
      words: [],
      confidence: 0.95,
      languageDetected: "pt-PT",
    };
    const primary: AsrTranscriber = vi.fn(async () => expected);
    const result = await withAsrFallback(primary, new Blob(), { lang: "pt-PT" });
    expect(result).toEqual(expected);
    expect(getHealthSnapshot().services.asr.status).toBe("ok");
  });

  it("falls back to a degraded result on a transient MiniMaxError", async () => {
    const failing: AsrTranscriber = vi.fn(async () => {
      throw new MiniMaxError("ASR down", 503, "asr");
    });
    const result = await withAsrFallback(failing, new Blob(), { lang: "pt-PT" });
    if (!("degraded" in result)) throw new Error("expected degraded result");
    expect(result.degraded).toBe(true);
    expect(result.degradedReason).toMatch(/ASR down/);
    expect(result.confidence).toBe(0);
    expect(getHealthSnapshot().services.asr.status).toBe("degraded");
  });

  it("rethrows non-transient MiniMaxError without degrading", async () => {
    const failing: AsrTranscriber = vi.fn(async () => {
      throw new MiniMaxError("Bad request", 400, "asr");
    });
    await expect(
      withAsrFallback(failing, new Blob(), { lang: "pt-PT" }),
    ).rejects.toThrow(/Bad request/);
    expect(getHealthSnapshot().services.asr.status).toBe("ok");
  });
});

describe("withLlmFallback", () => {
  it("returns the primary result when the call succeeds", async () => {
    const expected: LlmCompleteResult = {
      text: "ol\u00e1",
      usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
    };
    const primary: LlmCompleter = vi.fn(async () => expected);
    const result = await withLlmFallback(primary, [
      { role: "user", content: "ol\u00e1" },
    ]);
    expect(result).toEqual(expected);
    expect(getHealthSnapshot().services.llm.status).toBe("ok");
  });

  it("falls back to a canned response on a transient MiniMaxError", async () => {
    const failing: LlmCompleter = vi.fn(async () => {
      throw new MiniMaxError("LLM down", 502, "llm");
    });
    const result = await withLlmFallback(failing, [
      { role: "user", content: "ol\u00e1" },
    ]);
    if (!("degraded" in result)) throw new Error("expected degraded result");
    expect(result.degraded).toBe(true);
    expect(result.canned).toBe(true);
    expect(result.text.toLowerCase()).toMatch(/ol|como/);
    expect(getHealthSnapshot().services.llm.status).toBe("degraded");
  });

  it("uses a generic fallback for unrecognized utterances", async () => {
    const failing: LlmCompleter = vi.fn(async () => {
      throw new MiniMaxError("LLM down", 502, "llm");
    });
    const result = await withLlmFallback(failing, [
      { role: "user", content: "xyz unknown utterance" },
    ]);
    if (!("degraded" in result)) throw new Error("expected degraded result");
    expect(result.degraded).toBe(true);
    expect(result.text.length).toBeGreaterThan(0);
  });
});

describe("withTtsFallback", () => {
  it("returns the primary audio when the call succeeds", async () => {
    const expected: TtsSynthesizeResult = {
      audio: new Blob([new Uint8Array(8)], { type: "audio/mpeg" }),
      contentType: "audio/mpeg",
      durationMs: 100,
    };
    const primary: TtsSynthesizer = vi.fn(async () => expected);
    const voice = { id: "v1", dialect: "pt-PT" as const, gender: "female" as const };
    const result = await withTtsFallback(primary, "ol\u00e1", { voice });
    expect(result).toEqual(expected);
    expect(getHealthSnapshot().services.tts.status).toBe("ok");
  });

  it("falls back to a null-audio degraded result on a transient MiniMaxError", async () => {
    const failing: TtsSynthesizer = vi.fn(async () => {
      throw new MiniMaxError("TTS down", 500, "tts");
    });
    const voice = { id: "v1", dialect: "pt-PT" as const, gender: "female" as const };
    const result = await withTtsFallback(failing, "ol\u00e1", { voice });
    if (!("degraded" in result)) throw new Error("expected degraded result");
    expect(result.audio).toBeNull();
    expect(result.degraded).toBe(true);
    expect(getHealthSnapshot().services.tts.status).toBe("degraded");
  });
});

describe("GET /api/health", () => {
  it("returns ok when all services are healthy", async () => {
    const res = await getHealth();
    const body = (await res.json()) as {
      status: string;
      services: { asr: { status: string }; llm: { status: string }; tts: { status: string } };
    };
    expect(body.status).toBe("ok");
    expect(body.services.asr.status).toBe("ok");
    expect(body.services.llm.status).toBe("ok");
    expect(body.services.tts.status).toBe("ok");
  });

  it("flips to degraded when a single service is degraded", async () => {
    recordServiceStatus("asr", "degraded", "stub outage");
    const res = await getHealth();
    const body = (await res.json()) as { status: string };
    expect(body.status).toBe("degraded");
  });

  it("flips to down when any service is down", async () => {
    recordServiceStatus("tts", "down", "stub outage");
    const res = await getHealth();
    const body = (await res.json()) as { status: string };
    expect(body.status).toBe("down");
  });
});

describe("recordProbeHit + availability", () => {
  it("records probe hits and computes availability over the window", () => {
    const now = Date.now();
    recordProbeHit("asr", true, "eu-west", now - 10_000);
    recordProbeHit("asr", false, "us-east", now - 5_000);
    recordProbeHit("asr", true, "ap-south", now);
    const availability = getServiceAvailability("asr", 60_000, now);
    expect(availability.upPercent).toBeCloseTo(66.7, 1);
    expect(availability.sampleCount).toBeGreaterThanOrEqual(3);
  });

  it("honours the caller-supplied `now` parameter on every transition", () => {
    const t0 = 1_700_000_000_000;
    recordServiceStatus("llm", "down", "stub outage", t0);
    recordServiceStatus("llm", "ok", "recovered", t0 + 5_000);
    recordServiceStatus("llm", "degraded", "slow", t0 + 10_000);
    const early = getServiceAvailability("llm", 60_000, t0 + 30_000);
    expect(early.sampleCount).toBe(3);
    expect(early.upPercent).toBeCloseTo(33.3, 1);
    const later = getServiceAvailability("llm", 5_000, t0 + 30_000);
    expect(later.sampleCount).toBe(0);
    expect(later.upPercent).toBe(100);
  });
});

describe("withLatencyMetric default sink → ObservabilitySink", () => {
  it("emits a voice_loop_latency event through the active sink", async () => {
    const stubSink = {
      name: "stub",
      emit: vi.fn(),
      flush: vi.fn(async () => {}),
    };
    const { setObservabilitySink } = await import("@/lib/observability/sink");
    setObservabilitySink(stubSink);

    const { withLatencyMetric } = await import("@/lib/minimax/types");
    await withLatencyMetric("llm", async () => "ok");

    expect(stubSink.emit).toHaveBeenCalledTimes(1);
    const event = stubSink.emit.mock.calls[0]?.[0] as {
      kind: string;
      stage: string;
      latencyMs: number;
    };
    expect(event.kind).toBe("voice_loop_latency");
    expect(event.stage).toBe("llm");
    expect(typeof event.latencyMs).toBe("number");

    resetObservabilitySink();
  });

  it("the default console sink still emits a JSON line", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const { withLatencyMetric } = await import("@/lib/minimax/types");
    await withLatencyMetric("tts", async () => "ok");
    expect(info).toHaveBeenCalled();
    const firstCall = info.mock.calls[0]?.[0] as string;
    expect(firstCall).toContain("\"kind\":\"voice_loop_latency\"");
    expect(firstCall).toContain("\"stage\":\"tts\"");
    info.mockRestore();
  });
});

describe("consoleObservabilitySink", () => {
  it("uses the same name as the default active sink", () => {
    expect(consoleObservabilitySink.name).toBe("console");
  });
});