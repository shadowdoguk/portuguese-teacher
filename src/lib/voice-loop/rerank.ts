import { detectDialectDefects, scoreUtterance, type VocabularyByLevel } from "./difficulty-estimator";
import { payloadToTurn, parseStructuredOutput } from "./structured-output";
import { buildVoiceLoopSystemPrompt } from "./system-prompt";
import type { VoiceLoopTurn, VoiceLoopTurnInput } from "./types";
import type { Dialect, Level } from "@/lib/curriculum/types";
import type { LlmCompleteResult, LlmMessage } from "@/lib/minimax/types";

export type RerankDeps = {
  llm: (messages: LlmMessage[]) => Promise<LlmCompleteResult>;
  generateId: () => string;
  now: () => number;
  vocabByLevel: VocabularyByLevel;
  dialect: Dialect;
  level: Level;
  candidateCount?: number;
  pronunciationFromAsr?: (input: VoiceLoopTurnInput) => number;
};

export type ScoredCandidate = {
  index: number;
  utterance: string;
  llmDifficulty: number;
  score: number;
  comprehensionOk: boolean;
  dialectDefects: ReadonlyArray<{ token: string; start: number; end: number; reason: string }>;
};

export type RerankResult = {
  turn: VoiceLoopTurn;
  latencyMs: number;
  mock: boolean;
  scoredCandidates: ReadonlyArray<ScoredCandidate>;
  chosenIndex: number;
};

type Envelope = {
  candidates: ReadonlyArray<unknown>;
};

export async function generateAndRerankTurn(
  input: VoiceLoopTurnInput,
  deps: RerankDeps,
): Promise<RerankResult> {
  const startedAt = deps.now();
  const turnId = deps.generateId();
  const pronunciation = deps.pronunciationFromAsr?.(input) ?? 80;
  const candidateCount = Math.max(1, deps.candidateCount ?? 4);

  const systemPrompt = buildVoiceLoopSystemPrompt({
    dialect: deps.dialect,
    level: deps.level,
    candidateCount,
  });

  const messages: LlmMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: input.learnerText ?? "" },
  ];

  const response = await deps.llm(messages);
  const envelope = parseCandidatesEnvelope(response.text);
  const scored = scoreAndFilterCandidates(envelope.candidates, deps);

  if (scored.length === 0) {
    throw new Error("No valid candidates survived dialect + parse checks");
  }

  const chosenIndex = pickClosest(scored, input.difficultyTarget);

  const chosen = scored[chosenIndex]!;
  const turn = payloadToTurn(
    {
      nlu: { intent: "rerank.candidate", slots: {}, grammarFeatures: [], errorCategories: [] },
      utterance: chosen.utterance,
      feedback: [],
      difficulty_estimate: chosen.score,
      comprehension_ok: chosen.comprehensionOk,
    },
    {
      turnId,
      utteranceId: input.learnerUtteranceId,
      generatedAt: deps.now(),
      mock: false,
      pronunciationScore: pronunciation,
    },
  );

  return {
    turn,
    latencyMs: deps.now() - startedAt,
    mock: false,
    scoredCandidates: scored,
    chosenIndex,
  };
}

function parseCandidatesEnvelope(text: string): Envelope {
  const trimmed = text.trim();
  const candidate = extractFirstJsonObject(trimmed);
  if (!candidate) {
    throw new Error("LLM output did not contain a JSON object");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(candidate);
  } catch (error) {
    throw new Error(`LLM output was not valid JSON: ${(error as Error).message}`);
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("LLM output root must be a JSON object with a `candidates` array");
  }
  const list = (parsed as { candidates?: unknown }).candidates;
  if (!Array.isArray(list)) {
    throw new Error("LLM output missing `candidates` array");
  }
  return { candidates: list };
}

function extractFirstJsonObject(text: string): string | null {
  const firstBrace = text.indexOf("{");
  if (firstBrace === -1) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = firstBrace; i < text.length; i += 1) {
    const ch = text[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === "\\") {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return text.slice(firstBrace, i + 1);
    }
  }
  return null;
}

function scoreAndFilterCandidates(
  rawCandidates: ReadonlyArray<unknown>,
  deps: RerankDeps,
): ScoredCandidate[] {
  const scored: ScoredCandidate[] = [];
  rawCandidates.forEach((raw, index) => {
    let payload;
    try {
      payload = parseStructuredOutput(JSON.stringify(raw));
    } catch {
      return;
    }
    const defects = detectDialectDefects(payload.utterance);
    if (defects.defects.length > 0) {
      return;
    }
    const score = scoreUtterance(payload.utterance, deps.level, deps.vocabByLevel);
    scored.push({
      index,
      utterance: payload.utterance,
      llmDifficulty: payload.difficulty_estimate,
      score,
      comprehensionOk: payload.comprehension_ok,
      dialectDefects: defects.defects,
    });
  });
  return scored;
}

function pickClosest(scored: ReadonlyArray<ScoredCandidate>, target: number): number {
  let bestIndex = 0;
  let bestEstimatorGap = Math.abs(scored[0]!.score - target);
  let bestLlmGap = Math.abs(scored[0]!.llmDifficulty - target);
  for (let i = 1; i < scored.length; i += 1) {
    const candidate = scored[i]!;
    const estimatorGap = Math.abs(candidate.score - target);
    const llmGap = Math.abs(candidate.llmDifficulty - target);
    if (
      estimatorGap < bestEstimatorGap - 1e-9 ||
      (Math.abs(estimatorGap - bestEstimatorGap) <= 1e-9 && llmGap < bestLlmGap - 1e-9)
    ) {
      bestIndex = i;
      bestEstimatorGap = estimatorGap;
      bestLlmGap = llmGap;
    }
  }
  return bestIndex;
}