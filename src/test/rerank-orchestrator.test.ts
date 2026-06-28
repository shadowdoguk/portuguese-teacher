import { describe, expect, it } from "vitest";
import {
  buildRerankTelemetry,
  chooseVoiceLoopPath,
  isRerankCandidateForTier,
  telemetryLogLine,
} from "@/lib/voice-loop/rerank-orchestrator";

describe("chooseVoiceLoopPath", () => {
  it("returns rerank for Tier 1 in mock mode (when re-rank enabled)", () => {
    expect(
      chooseVoiceLoopPath({ tier: 1, rerankEnabled: true, mockMode: true, hasLiveLlm: false }),
    ).toBe("rerank");
  });

  it("returns rerank for Tier 2 in production with live LLM", () => {
    expect(
      chooseVoiceLoopPath({ tier: 2, rerankEnabled: true, mockMode: false, hasLiveLlm: true }),
    ).toBe("rerank");
  });

  it("returns runTurn for Tier 3 even when re-rank enabled", () => {
    expect(
      chooseVoiceLoopPath({ tier: 3, rerankEnabled: true, mockMode: false, hasLiveLlm: true }),
    ).toBe("runTurn");
  });

  it("returns runTurn for Tier 1 when re-rank flag is off", () => {
    expect(
      chooseVoiceLoopPath({ tier: 1, rerankEnabled: false, mockMode: false, hasLiveLlm: true }),
    ).toBe("runTurn");
  });

  it("returns runTurn for Tier 1 in production without live LLM", () => {
    expect(
      chooseVoiceLoopPath({ tier: 1, rerankEnabled: true, mockMode: false, hasLiveLlm: false }),
    ).toBe("runTurn");
  });

  it("returns runTurn for invalid tier values", () => {
    expect(
      chooseVoiceLoopPath({ tier: 5, rerankEnabled: true, mockMode: false, hasLiveLlm: true }),
    ).toBe("runTurn");
    expect(
      chooseVoiceLoopPath({ tier: 0, rerankEnabled: true, mockMode: false, hasLiveLlm: true }),
    ).toBe("runTurn");
  });
});

describe("isRerankCandidateForTier", () => {
  it("returns true for tier 1 and 2", () => {
    expect(isRerankCandidateForTier(1)).toBe(true);
    expect(isRerankCandidateForTier(2)).toBe(true);
  });
  it("returns false for tier 3 and others", () => {
    expect(isRerankCandidateForTier(3)).toBe(false);
    expect(isRerankCandidateForTier(0)).toBe(false);
    expect(isRerankCandidateForTier(5)).toBe(false);
  });
});

describe("buildRerankTelemetry", () => {
  it("captures chosen candidate fields", () => {
    const candidates = [
      { score: 0.5, utterance: "Olá!" },
      { score: 1.2, utterance: "Bom dia, como estás?" },
    ];
    const telemetry = buildRerankTelemetry(1, candidates, 1, 234, false);
    expect(telemetry.type).toBe("voice_loop_rerank_telemetry");
    expect(telemetry.tier).toBe(1);
    expect(telemetry.scoredCandidatesCount).toBe(2);
    expect(telemetry.chosenIndex).toBe(1);
    expect(telemetry.chosenScore).toBe(1.2);
    expect(telemetry.chosenUtterance).toBe("Bom dia, como estás?");
    expect(telemetry.latencyMs).toBe(234);
    expect(telemetry.mock).toBe(false);
  });

  it("throws when chosenIndex is out of range", () => {
    expect(() =>
      buildRerankTelemetry(1, [{ score: 0.5, utterance: "Olá!" }], 5, 100, false),
    ).toThrow();
  });
});

describe("telemetryLogLine", () => {
  it("serialises to a single-line JSON string", () => {
    const telemetry = buildRerankTelemetry(
      2,
      [{ score: 1.0, utterance: "Muito bem!" }],
      0,
      150,
      true,
    );
    const line = telemetryLogLine(telemetry);
    expect(line).not.toContain("\n");
    const parsed = JSON.parse(line);
    expect(parsed.type).toBe("voice_loop_rerank_telemetry");
    expect(parsed.chosenUtterance).toBe("Muito bem!");
  });
});
