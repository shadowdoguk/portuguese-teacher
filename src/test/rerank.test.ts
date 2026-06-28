import { describe, expect, it } from "vitest";
import { generateAndRerankTurn } from "@/lib/voice-loop/rerank";
import type { VocabularyByLevel } from "@/lib/voice-loop/difficulty-estimator";
import { vocabularyFor } from "@/lib/voice-loop/level-vocabulary";
import { buildInput } from "@/lib/voice-loop/orchestrator";
import type { LlmCompleteResult, LlmMessage } from "@/lib/minimax/types";

const FIXED_NOW = 1_700_000_000_000;

const VOCAB_BY_LEVEL: VocabularyByLevel = {
  A0: vocabularyFor("A0"),
  A1: vocabularyFor("A1"),
  A2: vocabularyFor("A2"),
  B1: vocabularyFor("B1"),
};

function mockLlm(text: string): (messages: LlmMessage[]) => Promise<LlmCompleteResult> {
  return async () => ({
    text,
    usage: { promptTokens: 8, completionTokens: text.length, totalTokens: 8 + text.length },
  });
}

function candidatesPayload(
  candidates: ReadonlyArray<{
    utterance: string;
    difficulty: number;
    comprehensionOk?: boolean;
  }>,
): string {
  return JSON.stringify({
    candidates: candidates.map((c) => ({
      nlu: {
        intent: "general.turn",
        slots: {},
        grammar_features: [],
        error_categories: [],
      },
      utterance: c.utterance,
      feedback: [],
      difficulty_estimate: c.difficulty,
      comprehension_ok: c.comprehensionOk ?? true,
    })),
  });
}

describe("generateAndRerankTurn — FR-AI-4", () => {
  it("asks the LLM for N candidates via the system prompt and parses the JSON envelope", async () => {
    let capturedSystem = "";
    const input = buildInput({
      learnerText: "olá",
      tier: 1,
      practiceMode: "free-form",
      difficultyTarget: 1.0,
    });
    await generateAndRerankTurn(input, {
      llm: async (messages) => {
        capturedSystem = messages[0]?.content ?? "";
        return {
          text: candidatesPayload([{ utterance: "Olá!", difficulty: 1.0 }]),
          usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
        };
      },
      generateId: () => "turn-1",
      now: () => FIXED_NOW,
      vocabByLevel: VOCAB_BY_LEVEL,
      dialect: "pt-PT",
      level: "A1",
      candidateCount: 4,
    });
    expect(capturedSystem).toMatch(/exactly 4/i);
    expect(capturedSystem).toMatch(/candidates/);
  });

  it("returns the candidate whose estimator score is closest to the i+1 target", async () => {
    const input = buildInput({
      learnerText: "olá",
      tier: 1,
      practiceMode: "free-form",
      difficultyTarget: 1.0,
    });
    const result = await generateAndRerankTurn(input, {
      llm: mockLlm(
        candidatesPayload([
          // All three contain only A0 words, so estimator score = 0 for all.
          // We pick the one whose self-reported difficulty is closest to 1.0.
          { utterance: "olá bom dia", difficulty: 0.5 }, // |0 - 1.0| = 1.0
          { utterance: "olá bom dia", difficulty: 1.0 }, // |0 - 1.0| = 1.0
          { utterance: "olá bom dia", difficulty: 2.0 }, // |0 - 1.0| = 1.0
          { utterance: "olá bom dia", difficulty: 1.0 }, // |0 - 1.0| = 1.0
        ]),
      ),
      generateId: () => "turn-2",
      now: () => FIXED_NOW,
      vocabByLevel: VOCAB_BY_LEVEL,
      dialect: "pt-PT",
      level: "A1",
      candidateCount: 4,
    });
    // All estimator scores are 0; |0 - 1.0| = 1.0 ties. We then fall back to
    // the LLM's own difficulty_estimate (also tied). Pick is deterministic by
    // original index — first match wins on stable sort. The important contract
    // is that the chosen candidate is one of the four and that we expose all
    // scored candidates for the A/B harness.
    expect(result.turn.teacherUtterance).toBe("olá bom dia");
    expect(result.scoredCandidates).toHaveLength(4);
    expect(result.chosenIndex).toBeGreaterThanOrEqual(0);
    expect(result.chosenIndex).toBeLessThan(4);
  });

  it("scores each candidate and exposes them on the result for the A/B harness", async () => {
    const input = buildInput({
      learnerText: "ontem fui ao café",
      tier: 1,
      practiceMode: "free-form",
      difficultyTarget: 1.5,
    });
    const result = await generateAndRerankTurn(input, {
      llm: mockLlm(
        candidatesPayload([
          { utterance: "olá", difficulty: 0.5 }, // score ≈ 0
          { utterance: "ontem fui ao café com a minha família", difficulty: 1.5 }, // higher TMR → higher score
          { utterance: "xyzzy plugh quux", difficulty: 1.5 }, // TMR ≈ 1 → score ≈ 3
          { utterance: "olá, tudo bem?", difficulty: 1.0 },
        ]),
      ),
      generateId: () => "turn-3",
      now: () => FIXED_NOW,
      vocabByLevel: VOCAB_BY_LEVEL,
      dialect: "pt-PT",
      level: "A0",
      candidateCount: 4,
    });
    expect(result.scoredCandidates).toHaveLength(4);
    const scores = result.scoredCandidates.map((c) => c.score);
    expect(scores[0]).toBeLessThan(scores[1]!);
    expect(scores[1]).toBeLessThan(scores[2]!);
    // The opaque utterance has the highest score; the chosen one must be the
    // candidate whose score is closest to target=1.5.
    expect(result.scoredCandidates[result.chosenIndex]!.score).toBeCloseTo(
      scores.reduce((best, s) => (Math.abs(s - 1.5) < Math.abs(best - 1.5) ? s : best)),
      5,
    );
  });

  it("drops candidates that contain pt-BR markers instead of pt-PT", async () => {
    const input = buildInput({
      learnerText: "olá",
      tier: 1,
      practiceMode: "free-form",
      difficultyTarget: 1.0,
    });
    const result = await generateAndRerankTurn(input, {
      llm: mockLlm(
        candidatesPayload([
          { utterance: "Você é gentil.", difficulty: 1.0 }, // dialect defect — dropped
          { utterance: "Olá, bom dia.", difficulty: 1.0 }, // clean
          { utterance: "Tá bom?", difficulty: 1.0 }, // dialect defect — dropped
          { utterance: "Tudo bem.", difficulty: 1.0 }, // clean
        ]),
      ),
      generateId: () => "turn-4",
      now: () => FIXED_NOW,
      vocabByLevel: VOCAB_BY_LEVEL,
      dialect: "pt-PT",
      level: "A1",
      candidateCount: 4,
    });
    expect(result.scoredCandidates).toHaveLength(2);
    expect(result.scoredCandidates.every((c) => c.dialectDefects.length === 0)).toBe(true);
    expect(["Olá, bom dia.", "Tudo bem."]).toContain(result.turn.teacherUtterance);
  });

  it("throws when no candidate survives dialect and parse checks", async () => {
    const input = buildInput({
      learnerText: "olá",
      tier: 1,
      practiceMode: "free-form",
      difficultyTarget: 1.0,
    });
    await expect(
      generateAndRerankTurn(input, {
        llm: mockLlm(
          candidatesPayload([
            { utterance: "Você é gentil.", difficulty: 1.0 },
            { utterance: "Tá bom?", difficulty: 1.0 },
          ]),
        ),
        generateId: () => "turn-5",
        now: () => FIXED_NOW,
        vocabByLevel: VOCAB_BY_LEVEL,
        dialect: "pt-PT",
        level: "A1",
        candidateCount: 4,
      }),
    ).rejects.toThrow(/no valid candidates/i);
  });

  it("throws on malformed JSON output from the LLM", async () => {
    const input = buildInput({
      learnerText: "olá",
      tier: 1,
      practiceMode: "free-form",
      difficultyTarget: 1.0,
    });
    await expect(
      generateAndRerankTurn(input, {
        llm: mockLlm("not-json"),
        generateId: () => "turn-6",
        now: () => FIXED_NOW,
        vocabByLevel: VOCAB_BY_LEVEL,
        dialect: "pt-PT",
        level: "A1",
        candidateCount: 4,
      }),
    ).rejects.toThrow();
  });
});