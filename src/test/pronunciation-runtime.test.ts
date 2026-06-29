import { describe, expect, it } from "vitest";
import { PronunciationRuntime, type CalibrationLogger } from "@/lib/voice-loop/pronunciation-runtime";
import type { MiniMaxPronunciation, MockMiniMaxPronunciation } from "@/lib/minimax";

class StubPronunciation {
  private readonly selfScores: number[] = [];
  private readonly map = new Map<string, number>();

  setReferenceScore(text: string, score: number) {
    this.map.set(text, score);
  }

  async score(options: { reference: string; observed: string; lang: "pt-PT" }): Promise<{
    score: number;
    perPhoneme: ReadonlyArray<{ phoneme: string; score: number; start: number; end: number }>;
  }> {
    if (options.reference === options.observed) {
      const score = this.map.get(options.reference);
      if (typeof score === "number") {
        this.selfScores.push(score);
        return { score, perPhoneme: [] };
      }
    }
    return { score: 50, perPhoneme: [] };
  }
}

function asPronunciation(s: StubPronunciation): MiniMaxPronunciation | MockMiniMaxPronunciation {
  return s as unknown as MiniMaxPronunciation | MockMiniMaxPronunciation;
}

describe("PronunciationRuntime", () => {
  it("runs the calibration set on first use and logs the baseline", async () => {
    const stub = new StubPronunciation();
    stub.setReferenceScore("olá, bom dia", 90);
    stub.setReferenceScore("como estás hoje", 88);
    stub.setReferenceScore("eu sou estudante", 90);
    stub.setReferenceScore("este é o meu amigo", 90);
    stub.setReferenceScore("obrigado pela ajuda", 90);
    stub.setReferenceScore("até logo, adeus", 90);
    stub.setReferenceScore("posso pedir um café", 90);
    stub.setReferenceScore("onde é a estação", 90);
    stub.setReferenceScore("tenho uma reunião", 90);
    stub.setReferenceScore("vamos começar agora", 90);
    const logs: string[] = [];
    const logger: CalibrationLogger = (line) => logs.push(line);
    const runtime = new PronunciationRuntime({ client: asPronunciation(stub), logger });

    expect(runtime.isCalibrated()).toBe(false);
    await runtime.ensureCalibrated();
    expect(runtime.isCalibrated()).toBe(true);
    expect(logs.length).toBe(1);
    expect(logs[0]).toMatch(/calibration/);
    expect(logs[0]).toMatch(/offset=10/);
  });

  it("only calibrates once across multiple calls", async () => {
    const stub = new StubPronunciation();
    const logs: string[] = [];
    const runtime = new PronunciationRuntime({
      client: asPronunciation(stub),
      logger: (line) => logs.push(line),
    });
    await runtime.ensureCalibrated();
    await runtime.ensureCalibrated();
    expect(logs.length).toBe(1);
  });

  it("exposes the calibration offset for downstream scoring", async () => {
    const stub = new StubPronunciation();
    stub.setReferenceScore("olá, bom dia", 80);
    stub.setReferenceScore("como estás hoje", 80);
    stub.setReferenceScore("eu sou estudante", 80);
    stub.setReferenceScore("este é o meu amigo", 80);
    stub.setReferenceScore("obrigado pela ajuda", 80);
    stub.setReferenceScore("até logo, adeus", 80);
    stub.setReferenceScore("posso pedir um café", 80);
    stub.setReferenceScore("onde é a estação", 80);
    stub.setReferenceScore("tenho uma reunião", 80);
    stub.setReferenceScore("vamos começar agora", 80);
    const runtime = new PronunciationRuntime({
      client: asPronunciation(stub),
      logger: () => undefined,
    });
    await runtime.ensureCalibrated();
    expect(runtime.getOffset()).toBe(20);
  });

  it("falls back to offset 0 when the calibration set fails", async () => {
    const failingClient = {
      score: async () => {
        throw new Error("network down");
      },
    };
    const logs: string[] = [];
    const runtime = new PronunciationRuntime({
      client: failingClient as unknown as MiniMaxPronunciation,
      logger: (line) => logs.push(line),
    });
    await runtime.ensureCalibrated();
    expect(runtime.getOffset()).toBe(0);
    expect(runtime.isCalibrated()).toBe(true);
    expect(logs.some((l) => /fallback/.test(l))).toBe(true);
  });
});