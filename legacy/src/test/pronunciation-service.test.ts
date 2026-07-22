import { describe, expect, it } from "vitest";
import { createPronunciationService } from "@/lib/voice-loop/pronunciation-service";
import { PronunciationRuntime } from "@/lib/voice-loop/pronunciation-runtime";
import type { MiniMaxPronunciation, MockMiniMaxPronunciation } from "@/lib/minimax";
import type { PronunciationScoreResult } from "@/lib/minimax/types";

class StubPronunciation {
  public readonly calls: Array<{ reference: string; observed: string; lang: string }> = [];
  public referenceSelfScores: Record<string, number> = {};

  async score(options: { reference: string; observed: string; lang: "pt-PT" }): Promise<PronunciationScoreResult> {
    this.calls.push(options);
    if (options.reference === options.observed) {
      const fallback = this.referenceSelfScores[options.reference] ?? 90;
      return { score: fallback, perPhoneme: [] };
    }
    return { score: 60, perPhoneme: [{ phoneme: "a", score: 60, start: 0, end: 0.2 }] };
  }
}

function stubAsClient(s: StubPronunciation): MiniMaxPronunciation | MockMiniMaxPronunciation {
  return s as unknown as MiniMaxPronunciation | MockMiniMaxPronunciation;
}

function runtimeFor(s: StubPronunciation): PronunciationRuntime {
  return new PronunciationRuntime({
    client: stubAsClient(s),
    logger: () => undefined,
  });
}

describe("createPronunciationService", () => {
  it("uses ASR confidence weighting for free-form turns", async () => {
    const stub = new StubPronunciation();
    const service = createPronunciationService({
      client: stubAsClient(stub),
      runtime: runtimeFor(stub),
      vocabBias: new Set(["olá"]),
    });
    const result = await service.resolve({
      learnerText: "olá mundo",
      learnerAsrConfidence: 0.9,
      learnerAsrWords: [
        { word: "olá", confidence: 0.9 },
        { word: "mundo", confidence: 0.85 },
      ],
      practiceMode: "free-form",
      tier: 3,
      difficultyTarget: 1.0,
      learnerUtteranceId: "u1",
    });
    expect(result.source).toBe("asr-bias");
    expect(result.score).toBeGreaterThan(80);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it("calls the endpoint for drill mode when a target phrase is provided", async () => {
    const stub = new StubPronunciation();
    const service = createPronunciationService({
      client: stubAsClient(stub),
      runtime: runtimeFor(stub),
    });
    const result = await service.resolve({
      learnerText: "olá",
      targetPhrase: "olá",
      practiceMode: "drill",
      tier: 1,
      difficultyTarget: 1.0,
      learnerUtteranceId: "u2",
    });
    expect(result.source).toBe("endpoint");
    expect(stub.calls.length).toBeGreaterThan(0);
    const userCall = stub.calls.find((c) => c.reference === "olá" && c.observed === "olá");
    expect(userCall).toBeDefined();
    expect(result.perPhoneme).toBeDefined();
  });

  it("falls back to ASR confidence when the endpoint call exceeds the budget", async () => {
    const calls: Array<{ reference: string; observed: string }> = [];
    const calibrationScores: Record<string, number> = {
      "olá, bom dia": 90,
      "como estás hoje": 90,
      "eu sou estudante": 90,
      "este é o meu amigo": 90,
      "obrigado pela ajuda": 90,
      "até logo, adeus": 90,
      "posso pedir um café": 90,
      "onde é a estação": 90,
      "tenho uma reunião": 90,
      "vamos começar agora": 90,
    };
    const hangingStub = {
      score: async (options: { reference: string; observed: string; lang: "pt-PT" }) => {
        calls.push({ reference: options.reference, observed: options.observed });
        if (options.reference === options.observed && calibrationScores[options.reference] !== undefined) {
          return { score: calibrationScores[options.reference]!, perPhoneme: [] };
        }
        // hang forever on the user-issued call
        return new Promise<PronunciationScoreResult>(() => {});
      },
    };
    const service = createPronunciationService({
      client: hangingStub as unknown as MiniMaxPronunciation,
      runtime: new PronunciationRuntime({
        client: hangingStub as unknown as MiniMaxPronunciation,
        logger: () => undefined,
      }),
      signalTimeoutMs: 20,
    });
    const result = await service.resolve({
      learnerText: "olá",
      targetPhrase: "olá",
      practiceMode: "drill",
      tier: 1,
      difficultyTarget: 1.0,
      learnerUtteranceId: "u3",
    });
    expect(result.source).toBe("asr-bias");
    // calibration calls (10) + the user-issued call = 11 (the last hangs)
    expect(calls.length).toBeGreaterThanOrEqual(11);
  });

  it("returns 0 from free-form when no ASR words and no learner text", async () => {
    const stub = new StubPronunciation();
    const service = createPronunciationService({
      client: stubAsClient(stub),
      runtime: runtimeFor(stub),
    });
    const result = await service.resolve({
      practiceMode: "free-form",
      tier: 3,
      difficultyTarget: 1.0,
      learnerUtteranceId: "u4",
    });
    expect(result.source).toBe("asr-bias");
    expect(result.score).toBe(0);
  });

  // Source attribution pins (ADR-0002 §"Pronunciation Score" — drill vs free-form).
  // Drill mode + targetPhrase + learnerText → source: "endpoint".
  // Drill mode + targetPhrase + empty learnerText → source: "default" (the
  //   inner drill guard short-circuits before calling the endpoint).
  // Drill mode WITHOUT targetPhrase → falls through to free-form
  //   (source: "asr-bias"); the initial `practiceMode === "drill" && input.targetPhrase`
  //   guard fails, so resolveFreeForm runs.
  // Drill mode + endpoint error/timeout → falls back to ASR bias
  //   (source: "asr-bias").
  // Free-form mode → source: "asr-bias" in all cases.
  it("falls through to source='asr-bias' for drill mode when targetPhrase is missing", async () => {
    const stub = new StubPronunciation();
    const service = createPronunciationService({
      client: stubAsClient(stub),
      runtime: runtimeFor(stub),
      vocabBias: new Set(["olá"]),
    });
    const result = await service.resolve({
      learnerText: "olá",
      learnerAsrConfidence: 0.9,
      learnerAsrWords: [{ word: "olá", confidence: 0.9 }],
      practiceMode: "drill",
      tier: 1,
      difficultyTarget: 1.0,
      learnerUtteranceId: "u5",
    });
    expect(result.source).toBe("asr-bias");
    // baseline=90, biasedScore=90, combined=90.
    expect(result.score).toBe(90);
  });

  it("returns source='default' for drill mode when learnerText is empty (inner guard)", async () => {
    const stub = new StubPronunciation();
    const service = createPronunciationService({
      client: stubAsClient(stub),
      runtime: runtimeFor(stub),
    });
    const result = await service.resolve({
      targetPhrase: "olá",
      practiceMode: "drill",
      tier: 1,
      difficultyTarget: 1.0,
      learnerUtteranceId: "u6",
    });
    expect(result.source).toBe("default");
    expect(result.score).toBe(0);
  });

  it("falls back to source='asr-bias' when the endpoint errors mid-call", async () => {
    const failingStub = {
      score: async () => {
        throw new Error("network unreachable");
      },
    };
    const service = createPronunciationService({
      client: failingStub as unknown as MiniMaxPronunciation,
      runtime: new PronunciationRuntime({
        client: failingStub as unknown as MiniMaxPronunciation,
        logger: () => undefined,
      }),
    });
    const result = await service.resolve({
      learnerText: "olá",
      learnerAsrConfidence: 0.85,
      targetPhrase: "olá",
      practiceMode: "drill",
      tier: 1,
      difficultyTarget: 1.0,
      learnerUtteranceId: "u7",
    });
    expect(result.source).toBe("asr-bias");
    // baseline = 0.85 * 100 = 85 (no bias vocabulary set).
    expect(result.score).toBe(85);
  });

  it("attaches per-phoneme when source='endpoint'", async () => {
    const stub = new StubPronunciation();
    const service = createPronunciationService({
      client: stubAsClient(stub),
      runtime: runtimeFor(stub),
    });
    const result = await service.resolve({
      learnerText: "olá",
      targetPhrase: "olá mundo",
      practiceMode: "drill",
      tier: 1,
      difficultyTarget: 1.0,
      learnerUtteranceId: "u8",
    });
    expect(result.source).toBe("endpoint");
    expect(result.perPhoneme).toBeDefined();
  });

  it("omits per-phoneme when source='asr-bias' (free-form has no phoneme breakdown)", async () => {
    const stub = new StubPronunciation();
    const service = createPronunciationService({
      client: stubAsClient(stub),
      runtime: runtimeFor(stub),
      vocabBias: new Set(["olá"]),
    });
    const result = await service.resolve({
      learnerText: "olá mundo",
      learnerAsrConfidence: 0.9,
      learnerAsrWords: [
        { word: "olá", confidence: 0.9 },
        { word: "mundo", confidence: 0.9 },
      ],
      practiceMode: "free-form",
      tier: 3,
      difficultyTarget: 1.0,
      learnerUtteranceId: "u9",
    });
    expect(result.source).toBe("asr-bias");
    expect(result.perPhoneme).toBeUndefined();
  });

  it("omits per-phoneme when source='default' (no signal collected)", async () => {
    const stub = new StubPronunciation();
    const service = createPronunciationService({
      client: stubAsClient(stub),
      runtime: runtimeFor(stub),
    });
    const result = await service.resolve({
      practiceMode: "drill",
      targetPhrase: "olá",
      learnerText: "",
      tier: 1,
      difficultyTarget: 1.0,
      learnerUtteranceId: "u10",
    });
    expect(result.source).toBe("default");
    expect(result.perPhoneme).toBeUndefined();
  });
});