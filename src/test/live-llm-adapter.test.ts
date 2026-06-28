import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LiveHarnessError, buildLiveHarness, buildLiveHarnessFromEnv } from "@/lib/voice-loop/live-llm-adapter";

describe("buildLiveHarness", () => {
  it("returns a handle with both rerank and prompt-only LLMs", () => {
    const handle = buildLiveHarness({
      baseUrl: "https://example.test",
      apiKey: "key",
      model: "minimax-test",
    });
    expect(handle.mode).toBe("live");
    expect(typeof handle.rerankLlm).toBe("function");
    expect(typeof handle.promptOnlyLlm).toBe("function");
  });
});

describe("buildLiveHarnessFromEnv", () => {
  const originalEnv = { ...process.env };
  const originalMock = process.env.NEXT_PUBLIC_MOCK;

  beforeEach(() => {
    delete process.env.MINIMAX_LLM_BASE_URL;
    delete process.env.MINIMAX_LLM_API_KEY;
    delete process.env.MINIMAX_LLM_MODEL;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    if (originalMock === undefined) {
      delete process.env.NEXT_PUBLIC_MOCK;
    } else {
      process.env.NEXT_PUBLIC_MOCK = originalMock;
    }
  });

  it("throws LiveHarnessError when NEXT_PUBLIC_MOCK=1", () => {
    process.env.NEXT_PUBLIC_MOCK = "1";
    expect(() => buildLiveHarnessFromEnv()).toThrow(LiveHarnessError);
  });

  it("throws LiveHarnessError when MINIMAX_LLM_BASE_URL is missing", () => {
    delete process.env.NEXT_PUBLIC_MOCK;
    process.env.MINIMAX_LLM_API_KEY = "key";
    expect(() => buildLiveHarnessFromEnv()).toThrow(/MINIMAX_LLM_BASE_URL/);
  });

  it("throws LiveHarnessError when MINIMAX_LLM_API_KEY is missing", () => {
    delete process.env.NEXT_PUBLIC_MOCK;
    process.env.MINIMAX_LLM_BASE_URL = "https://example.test";
    expect(() => buildLiveHarnessFromEnv()).toThrow(/MINIMAX_LLM_API_KEY/);
  });

  it("builds a live handle when both env vars are set", () => {
    delete process.env.NEXT_PUBLIC_MOCK;
    process.env.MINIMAX_LLM_BASE_URL = "https://example.test";
    process.env.MINIMAX_LLM_API_KEY = "key";
    const handle = buildLiveHarnessFromEnv();
    expect(handle.mode).toBe("live");
  });
});

describe("live harness integration with runAbHarness", () => {
  it("runs against a stubbed MiniMax LLM (in-band rate reported)", async () => {
    const singlePayload = {
      nlu: { intent: "i", slots: {}, grammar_features: [], error_categories: [] },
      utterance: "Olá, bom dia!",
      feedback: [],
      difficulty_estimate: 0.4,
      comprehension_ok: true,
    };
    const candidatesEnvelope = {
      candidates: [
        { ...singlePayload, utterance: "Olá, bom dia!", difficulty_estimate: 0.4 },
        { ...singlePayload, utterance: "Como estás hoje?", difficulty_estimate: 0.6 },
        { ...singlePayload, utterance: "Muito bem, obrigado.", difficulty_estimate: 0.5 },
        { ...singlePayload, utterance: "Até logo, amigo.", difficulty_estimate: 0.5 },
      ],
    };
    const promptOnlyStub = vi.fn(async () => ({
      text: JSON.stringify(singlePayload),
      usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
    }));
    const rerankStub = vi.fn(async () => ({
      text: JSON.stringify(candidatesEnvelope),
      usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
    }));

    const { runAbHarness } = await import("@/lib/voice-loop/ab-harness");
    const { A0_TO_A1_CORPUS } = await import("@/lib/voice-loop/ab-corpus");
    const { vocabularyFor } = await import("@/lib/voice-loop/level-vocabulary");

    const report = await runAbHarness({
      corpus: A0_TO_A1_CORPUS,
      vocabByLevel: {
        A0: vocabularyFor("A0"),
        A1: vocabularyFor("A1"),
        A2: vocabularyFor("A2"),
        B1: vocabularyFor("B1"),
      },
      dialect: "pt-PT",
      mode: "live",
      liveRerankLlm: rerankStub,
      livePromptOnlyLlm: {
        __kind: "live",
        callLive: promptOnlyStub,
      },
    });

    expect(report.mode).toBe("live");
    expect(report.summary.utteranceCount).toBe(A0_TO_A1_CORPUS.entries.length);
    expect(rerankStub).toHaveBeenCalled();
    expect(promptOnlyStub).toHaveBeenCalled();
  });
});
