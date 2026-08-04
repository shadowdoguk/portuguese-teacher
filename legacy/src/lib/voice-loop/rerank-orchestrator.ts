import type { BrowserTier, VoiceLoopTurn } from "./types";
import { isBrowserTier } from "./types";

export type VoiceLoopPath = "rerank" | "runTurn";

export type RerankTelemetry = {
  type: "voice_loop_rerank_telemetry";
  tier: BrowserTier;
  scoredCandidatesCount: number;
  chosenIndex: number;
  chosenScore: number;
  chosenUtterance: string;
  latencyMs: number;
  mock: boolean;
};

export type PathDecisionInput = {
  tier: number;
  rerankEnabled: boolean;
  mockMode: boolean;
  hasLiveLlm: boolean;
};

export function chooseVoiceLoopPath(input: PathDecisionInput): VoiceLoopPath {
  if (!isBrowserTier(input.tier)) return "runTurn";
  if (input.tier === 3) return "runTurn";
  if (!input.rerankEnabled) return "runTurn";
  if (input.mockMode) return "rerank";
  if (input.hasLiveLlm) return "rerank";
  return "runTurn";
}

export function isRerankCandidateForTier(tier: number): tier is 1 | 2 {
  return tier === 1 || tier === 2;
}

export function buildRerankTelemetry(
  tier: BrowserTier,
  scoredCandidates: ReadonlyArray<{ score: number; utterance: string }>,
  chosenIndex: number,
  latencyMs: number,
  mock: boolean,
): RerankTelemetry {
  const chosen = scoredCandidates[chosenIndex];
  if (!chosen) {
    throw new Error(
      `Cannot build rerank telemetry: chosenIndex ${chosenIndex} out of range (${scoredCandidates.length})`,
    );
  }
  return {
    type: "voice_loop_rerank_telemetry",
    tier,
    scoredCandidatesCount: scoredCandidates.length,
    chosenIndex,
    chosenScore: chosen.score,
    chosenUtterance: chosen.utterance,
    latencyMs,
    mock,
  };
}

export function telemetryLogLine(telemetry: RerankTelemetry): string {
  return JSON.stringify(telemetry);
}

export function telemetryFromTurn(
  turn: VoiceLoopTurn,
  tier: BrowserTier,
): Pick<RerankTelemetry, "chosenUtterance" | "latencyMs" | "mock"> {
  return {
    chosenUtterance: turn.teacherUtterance,
    latencyMs: turn.generatedAt,
    mock: turn.mock,
  };
}
