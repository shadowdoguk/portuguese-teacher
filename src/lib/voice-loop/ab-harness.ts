import type { Level } from "@/lib/curriculum/types";
import { buildVoiceLoopSystemPrompt } from "./system-prompt";
import { generateAndRerankTurn, type ScoredCandidate } from "./rerank";
import { parseStructuredOutput } from "./structured-output";
import {
  detectDialectDefects,
  scoreUtterance,
  type VocabularyByLevel,
} from "./difficulty-estimator";
import { buildInput } from "./orchestrator";
import { buildMockPromptOnlyLlm, buildMockRerankLlm } from "./ab-mocks";
import type { AbCorpus } from "./ab-corpus";
import type { LlmCompleteResult, LlmMessage } from "@/lib/minimax/types";

export type AbHarnessRow = {
  id: string;
  learnerInput: string;
  notes: string;
  promptOnly: {
    utterance: string;
    score: number;
    llmDifficulty: number;
    inBand: boolean;
    dialectDefectCount: number;
  };
  rerank: {
    chosenUtterance: string;
    chosenScore: number;
    candidates: ReadonlyArray<ScoredCandidate>;
    inBand: boolean;
    dialectDefectCount: number;
  };
};

export type AbHarnessSummary = {
  utteranceCount: number;
  targetLevel: Level;
  target: number;
  bandHalfWidth: number;
  promptOnly: { meanScore: number; meanLlmDifficulty: number; inBandPct: number };
  rerank: { meanScore: number; meanLlmDifficulty: number; inBandPct: number };
  delta: { meanScore: number; inBandPct: number };
};

export type AbHarnessReport = {
  summary: AbHarnessSummary;
  rows: ReadonlyArray<AbHarnessRow>;
  generatedAt: string;
  mode: "mock" | "live";
};

export type AbHarnessOptions = {
  corpus: AbCorpus;
  vocabByLevel: VocabularyByLevel;
  dialect: "pt-PT";
  mode?: "mock" | "live";
  now?: () => number;
  generateId?: () => string;
};

export async function runAbHarness(options: AbHarnessOptions): Promise<AbHarnessReport> {
  const mode = options.mode ?? "mock";
  const now = options.now ?? (() => Date.now());
  const generateId = options.generateId ?? (() => `turn-${Math.random().toString(36).slice(2, 8)}`);

  const promptOnlyLlm = mode === "mock" ? buildMockPromptOnlyLlm() : null;
  const rerankLlm = mode === "mock" ? buildMockRerankLlm() : null;

  const rows: AbHarnessRow[] = [];
  for (const entry of options.corpus.entries) {
    const input = buildInput({
      learnerText: entry.learnerInput,
      tier: 1,
      practiceMode: "free-form",
      difficultyTarget: options.corpus.target,
    });

    const promptOnlyText = await runPromptOnlyOnce({
      input,
      llm: promptOnlyLlm ?? defaultLivePromptOnlyLlm(),
      entryId: entry.id,
    });
    const promptOnlyPayload = parseStructuredOutput(promptOnlyText);
    const promptOnlyScore = scoreUtterance(
      promptOnlyPayload.utterance,
      options.corpus.targetLevel,
      options.vocabByLevel,
    );
    const promptOnlyDefects = detectDialectDefects(promptOnlyPayload.utterance);

    const rerankResult = await generateAndRerankTurn(input, {
      llm: rerankLlm ?? defaultLiveRerankLlm(),
      generateId,
      now,
      vocabByLevel: options.vocabByLevel,
      dialect: options.dialect,
      level: options.corpus.targetLevel,
      candidateCount: 4,
    });

    rows.push({
      id: entry.id,
      learnerInput: entry.learnerInput,
      notes: entry.notes,
      promptOnly: {
        utterance: promptOnlyPayload.utterance,
        score: promptOnlyScore,
        llmDifficulty: promptOnlyPayload.difficulty_estimate,
        inBand: Math.abs(promptOnlyScore - options.corpus.target) <= options.corpus.bandHalfWidth,
        dialectDefectCount: promptOnlyDefects.defects.length,
      },
      rerank: {
        chosenUtterance: rerankResult.turn.teacherUtterance,
        chosenScore: rerankResult.scoredCandidates[rerankResult.chosenIndex]!.score,
        candidates: rerankResult.scoredCandidates,
        inBand:
          Math.abs(
            rerankResult.scoredCandidates[rerankResult.chosenIndex]!.score -
              options.corpus.target,
          ) <= options.corpus.bandHalfWidth,
        dialectDefectCount: rerankResult.scoredCandidates[rerankResult.chosenIndex]!.dialectDefects
          .length,
      },
    });
  }

  const promptOnlyScores = rows.map((r) => r.promptOnly.score);
  const rerankScores = rows.map((r) => r.rerank.chosenScore);
  const promptOnlyInBand = rows.filter((r) => r.promptOnly.inBand).length;
  const rerankInBand = rows.filter((r) => r.rerank.inBand).length;

  const summary: AbHarnessSummary = {
    utteranceCount: rows.length,
    targetLevel: options.corpus.targetLevel,
    target: options.corpus.target,
    bandHalfWidth: options.corpus.bandHalfWidth,
    promptOnly: {
      meanScore: mean(promptOnlyScores),
      meanLlmDifficulty: mean(rows.map((r) => r.promptOnly.llmDifficulty)),
      inBandPct: promptOnlyInBand / rows.length,
    },
    rerank: {
      meanScore: mean(rerankScores),
      meanLlmDifficulty: mean(rerankScores),
      inBandPct: rerankInBand / rows.length,
    },
    delta: {
      meanScore: mean(rerankScores) - mean(promptOnlyScores),
      inBandPct: rerankInBand / rows.length - promptOnlyInBand / rows.length,
    },
  };

  return {
    summary,
    rows,
    generatedAt: new Date().toISOString(),
    mode,
  };
}

async function runPromptOnlyOnce(args: {
  input: ReturnType<typeof buildInput>;
  llm: PromptOnlyLlm | LivePromptOnlyLlm;
  entryId: string;
}): Promise<string> {
  if ("__kind" in args.llm && args.llm.__kind === "mock") {
    return args.llm.callOnce(args.entryId);
  }
  const systemPrompt = buildVoiceLoopSystemPrompt({
    dialect: "pt-PT",
    level: "A0",
    candidateCount: 1,
  });
  const messages: LlmMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: args.input.learnerText ?? "" },
  ];
  return (await args.llm.callLive(messages)).text;
}

type PromptOnlyLlm = { __kind: "mock"; callOnce: (id: string) => Promise<string> };
type LivePromptOnlyLlm = {
  __kind: "live";
  callLive: (messages: LlmMessage[]) => Promise<LlmCompleteResult>;
};

function defaultLivePromptOnlyLlm(): LivePromptOnlyLlm {
  return {
    __kind: "live",
    async callLive() {
      throw new Error(
        "Prompt-only LLM not configured. Pass mode:'mock' or wire a real LLM.",
      );
    },
  };
}

function defaultLiveRerankLlm(): (messages: LlmMessage[]) => Promise<LlmCompleteResult> {
  return async () => {
    throw new Error(
      "Rerank LLM not configured. Pass mode:'mock' or wire a real LLM.",
    );
  };
}

function mean(xs: ReadonlyArray<number>): number {
  if (xs.length === 0) return 0;
  let total = 0;
  for (const x of xs) total += x;
  return total / xs.length;
}

export function formatAbReport(report: AbHarnessReport): string {
  const { summary, rows, generatedAt, mode } = report;
  const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
  const score = (x: number) => x.toFixed(3);
  const lines: string[] = [];
  lines.push(`# Difficulty-control A/B harness report`);
  lines.push("");
  lines.push(`- Generated: ${generatedAt}`);
  lines.push(`- Mode: **${mode}** ${mode === "mock" ? "(mocked LLM — production validation needs a live MiniMax LLM)" : "(live MiniMax LLM)"}`);
  lines.push(`- Utterances scored: ${summary.utteranceCount}`);
  lines.push(`- Target CEFR level: **${summary.targetLevel}**`);
  lines.push(`- i+1 target score: **${score(summary.target)}** (band ±${score(summary.bandHalfWidth)})`);
  lines.push("");
  lines.push(`## Summary`);
  lines.push("");
  lines.push(`| Mode | Mean estimator score | In-band % |`);
  lines.push(`| --- | --- | --- |`);
  lines.push(`| Prompt-only | ${score(summary.promptOnly.meanScore)} | ${pct(summary.promptOnly.inBandPct)} |`);
  lines.push(`| Re-ranked | ${score(summary.rerank.meanScore)} | ${pct(summary.rerank.inBandPct)} |`);
  lines.push(`| **Δ (re-ranked − prompt-only)** | **${score(summary.delta.meanScore)}** | **${pct(summary.delta.inBandPct)}** |`);
  lines.push("");
  if (mode === "mock") {
    lines.push(`> **Note**: this run used a mock LLM that simulates Jin et al.'s (2026) "alignment drift" toward native-level output. To validate the ≥ 75% in-band target from issue #6 acceptance criteria, run \`runAbHarness({ mode: 'live' })\` with a real MiniMax LLM. The mock harness exists so CI catches regressions in the re-ranker without burning LLM budget.`);
    lines.push("");
  }
  lines.push(`## Per-utterance results`);
  lines.push("");
  lines.push(`| # | Learner input | Notes | Prompt-only utterance | PO score | PO in-band | Re-ranked utterance | RR score | RR in-band | RR defects |`);
  lines.push(`| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |`);
  rows.forEach((row, idx) => {
    lines.push(
      `| ${idx + 1} | ${row.learnerInput} | ${row.notes} | ${row.promptOnly.utterance} | ${score(row.promptOnly.score)} | ${row.promptOnly.inBand ? "✓" : "✗"} | ${row.rerank.chosenUtterance} | ${score(row.rerank.chosenScore)} | ${row.rerank.inBand ? "✓" : "✗"} | ${row.rerank.dialectDefectCount} |`,
    );
  });
  lines.push("");
  return lines.join("\n");
}