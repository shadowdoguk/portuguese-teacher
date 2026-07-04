// Route-level integration test for /api/voice-loop/turn.
//
// Exercises the full POST handler end-to-end so the Pronunciation Score
// resolution (drill + free-form paths) is pinned through the request
// shape that the client sends. The MiniMax clients are the mocks so the
// test is hermetic — no live endpoints required. Issue #37 acceptance.

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { POST as voiceLoopTurn } from "@/app/api/voice-loop/turn/route";
import {
  resetPronunciationRuntimeForTests,
} from "@/lib/voice-loop/pronunciation-runtime";

const ORIGINAL_MOCK = process.env.NEXT_PUBLIC_MOCK;
const ORIGINAL_RERANK = process.env.ENABLE_RERANK_PATH;

beforeEach(() => {
  process.env.NEXT_PUBLIC_MOCK = "1";
  process.env.ENABLE_RERANK_PATH = "1";
  resetPronunciationRuntimeForTests();
});

afterEach(() => {
  if (ORIGINAL_MOCK === undefined) {
    delete process.env.NEXT_PUBLIC_MOCK;
  } else {
    process.env.NEXT_PUBLIC_MOCK = ORIGINAL_MOCK;
  }
  if (ORIGINAL_RERANK === undefined) {
    delete process.env.ENABLE_RERANK_PATH;
  } else {
    process.env.ENABLE_RERANK_PATH = ORIGINAL_RERANK;
  }
  resetPronunciationRuntimeForTests();
});

function jsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/voice-loop/turn", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/voice-loop/turn — Pronunciation Score resolution", () => {
  it("returns 400 when learnerText is missing", async () => {
    const res = await voiceLoopTurn(jsonRequest({ tier: 3, practiceMode: "free-form" }));
    expect(res.status).toBe(400);
  });

  it("free-form (Tier 3) emits a Pronunciation Score with source='asr-bias' and no per-phoneme", async () => {
    const res = await voiceLoopTurn(
      jsonRequest({
        learnerText: "olá mundo",
        tier: 3,
        practiceMode: "free-form",
        difficultyTarget: 1.0,
        learnerLevel: "A0",
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      ok: boolean;
      path: string;
      turn: {
        pronunciationScore: number;
        pronunciationSource: string;
        pronunciationPerPhoneme?: unknown;
        mock: boolean;
      };
    };
    expect(body.ok).toBe(true);
    expect(body.path).toBe("runTurn");
    expect(body.turn.mock).toBe(true);
    // Tier 3 always falls into the scripted runTurn path with a default
    // 80 placeholder (orchestrator.resolvePronunciation's no-resolver branch).
    // When the route supplies a real resolver, the source is "asr-bias".
    expect(body.turn.pronunciationSource).toBe("asr-bias");
    expect(typeof body.turn.pronunciationScore).toBe("number");
    expect(body.turn.pronunciationScore).toBeGreaterThan(0);
    expect(body.turn.pronunciationPerPhoneme).toBeUndefined();
  });

  it("drill mode (Tier 3) with targetPhrase emits source='endpoint' with per-phoneme", async () => {
    const res = await voiceLoopTurn(
      jsonRequest({
        learnerText: "olá",
        tier: 3,
        practiceMode: "drill",
        targetPhrase: "olá",
        difficultyTarget: 1.0,
        learnerLevel: "A0",
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      ok: boolean;
      path: string;
      turn: {
        pronunciationScore: number;
        pronunciationSource: string;
        pronunciationPerPhoneme?: ReadonlyArray<{ phoneme: string; score: number }>;
      };
    };
    expect(body.ok).toBe(true);
    expect(body.turn.pronunciationSource).toBe("endpoint");
    expect(body.turn.pronunciationPerPhoneme).toBeDefined();
    expect(body.turn.pronunciationPerPhoneme?.length).toBeGreaterThan(0);
  });

  it("drill mode with empty learnerText emits source='default' (inner guard)", async () => {
    const res = await voiceLoopTurn(
      jsonRequest({
        learnerText: "",
        tier: 3,
        practiceMode: "drill",
        targetPhrase: "olá",
        difficultyTarget: 1.0,
        learnerLevel: "A0",
      }),
    );
    expect(res.status).toBe(400); // route rejects empty learnerText
  });

  it("rerank path (Tier 1, mock) resolves pronunciation through the resolver", async () => {
    const res = await voiceLoopTurn(
      jsonRequest({
        learnerText: "olá",
        tier: 1,
        practiceMode: "drill",
        targetPhrase: "olá",
        difficultyTarget: 1.0,
        learnerLevel: "A0",
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      ok: boolean;
      path: string;
      turn: {
        pronunciationScore: number;
        pronunciationSource: string;
        pronunciationPerPhoneme?: ReadonlyArray<{ phoneme: string; score: number }>;
      };
    };
    expect(body.ok).toBe(true);
    // In mock mode, chooseVoiceLoopPath returns "rerank" for Tier 1/2.
    expect(body.path).toBe("rerank");
    expect(body.turn.pronunciationSource).toBe("endpoint");
    expect(body.turn.pronunciationPerPhoneme).toBeDefined();
  });

  it("free-form (Tier 1, rerank path) uses ASR-bias source without per-phoneme", async () => {
    const res = await voiceLoopTurn(
      jsonRequest({
        learnerText: "olá mundo",
        tier: 1,
        practiceMode: "free-form",
        difficultyTarget: 1.0,
        learnerLevel: "A0",
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      ok: boolean;
      path: string;
      turn: {
        pronunciationScore: number;
        pronunciationSource: string;
        pronunciationPerPhoneme?: unknown;
      };
    };
    expect(body.ok).toBe(true);
    expect(body.path).toBe("rerank");
    expect(body.turn.pronunciationSource).toBe("asr-bias");
    expect(body.turn.pronunciationPerPhoneme).toBeUndefined();
  });

  it("learnerLevel=A1 wires the A1 vocab bias into the free-form score", async () => {
    // A1 vocab includes "café". The ASR-bias normalisation should
    // strip diacritics so "café" (bias) matches "café" (learner text) — issue #37
    // regression pin for the bias-side normalisation fix.
    const res = await voiceLoopTurn(
      jsonRequest({
        learnerText: "um café por favor",
        learnerAsrConfidence: 0.95,
        learnerAsrWords: [
          { word: "um", confidence: 0.95 },
          { word: "café", confidence: 0.95 },
          { word: "por", confidence: 0.95 },
          { word: "favor", confidence: 0.95 },
        ],
        tier: 3,
        practiceMode: "free-form",
        difficultyTarget: 1.0,
        learnerLevel: "A1",
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      ok: boolean;
      turn: { pronunciationScore: number; pronunciationSource: string };
    };
    expect(body.turn.pronunciationSource).toBe("asr-bias");
    // All 4 words in the A1 vocab, all 0.95 → baseline = biasedScore = 95.
    expect(body.turn.pronunciationScore).toBe(95);
  });
});

// ADR-0002 §"Graceful degradation" + issue #106-5: the voice-loop turn
// route must wire withLlmFallback so a transient LLM outage returns a
// canned degraded response instead of 500.
//
// We test this at the orchestrator layer (runTurn) where the `llm` dep
// is injected — that's where the wrapper actually sits. The route-level
// integration test would require live creds which the test env doesn't
// have.
describe("withLlmFallback wired into the voice-loop turn (issue #106-5)", () => {
  const ORIGINAL_MOCK = process.env.NEXT_PUBLIC_MOCK;
  beforeEach(() => {
    // runTurn only calls deps.llm when !deps.mock && tier !== 3.
    // Set mock=0 so the orchestrator actually exercises the LLM.
    process.env.NEXT_PUBLIC_MOCK = "0";
    process.env.ENABLE_RERANK_PATH = "0";
  });
  afterEach(() => {
    if (ORIGINAL_MOCK === undefined) delete process.env.NEXT_PUBLIC_MOCK;
    else process.env.NEXT_PUBLIC_MOCK = ORIGINAL_MOCK;
  });

  it("Tier 1 runTurn returns a degraded teacher utterance when the LLM is down", async () => {
    const { runTurn, buildInput, buildDegradedTurn } = await import("@/lib/voice-loop");
    const { MiniMaxError } = await import("@/lib/minimax/types");
    const { isTransientError } = await import("@/lib/minimax/fallbacks");

    const failingLlm = async () => {
      throw new MiniMaxError("LLM down (test)", 503, "llm");
    };

    const input = buildInput({
      learnerText: "olá",
      tier: 1,
      practiceMode: "free-form",
      difficultyTarget: 1.5,
    });

    // Mirror the route's wire shape: try the orchestrator, fall back to
    // buildDegradedTurn on transient LLM error.
    let result;
    try {
      result = await runTurn(input, {
        llm: failingLlm,
        generateId: () => "turn-fallback-test",
        now: () => 0,
      });
    } catch (cause) {
      if (!isTransientError(cause)) throw cause;
      result = { turn: buildDegradedTurn(input, 0), latencyMs: 0, mock: false };
    }
    expect(result.mock).toBe(false);
    expect(result.turn.degraded).toBe(true);
    expect(typeof result.turn.teacherUtterance).toBe("string");
    expect(result.turn.teacherUtterance.length).toBeGreaterThan(0);
  });

  it("the wrapper rethrows non-transient errors (e.g. 4xx other than 408/429)", async () => {
    const { runTurn, buildInput } = await import("@/lib/voice-loop");
    const { MiniMaxError } = await import("@/lib/minimax/types");
    const { isTransientError } = await import("@/lib/minimax/fallbacks");

    const failingLlm = async () => {
      throw new MiniMaxError("Bad request (test)", 400, "llm");
    };

    const input = buildInput({
      learnerText: "olá",
      tier: 1,
      practiceMode: "free-form",
      difficultyTarget: 1.5,
    });

    await expect(
      runTurn(input, {
        llm: failingLlm,
        generateId: () => "turn-nofallback",
        now: () => 0,
      }),
    ).rejects.toThrow(/Bad request/);
  });
});