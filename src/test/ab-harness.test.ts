import { describe, expect, it } from "vitest";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  A0_TO_A1_CORPUS,
  formatAbReport,
  runAbHarness,
  vocabularyFor,
  type VocabularyByLevel,
} from "@/lib/voice-loop";

const VOCAB_BY_LEVEL: VocabularyByLevel = {
  A0: vocabularyFor("A0"),
  A1: vocabularyFor("A1"),
  A2: vocabularyFor("A2"),
  B1: vocabularyFor("B1"),
};

const REPORT_PATH = join(process.cwd(), "tmp", "difficulty-ab-report.md");

describe("A/B harness — FR-AI-4", () => {
  it("loads a 100-utterance A0→A1 corpus", () => {
    expect(A0_TO_A1_CORPUS.entries).toHaveLength(100);
    expect(A0_TO_A1_CORPUS.targetLevel).toBe("A0");
    expect(A0_TO_A1_CORPUS.target).toBeGreaterThan(0);
    expect(A0_TO_A1_CORPUS.bandHalfWidth).toBeGreaterThan(0);
  });

  it("runs both modes against every entry and emits summary stats", async () => {
    const report = await runAbHarness({
      corpus: A0_TO_A1_CORPUS,
      vocabByLevel: VOCAB_BY_LEVEL,
      dialect: "pt-PT",
      mode: "mock",
    });

    expect(report.rows).toHaveLength(100);
    expect(report.summary.utteranceCount).toBe(100);
    expect(report.summary.promptOnly.inBandPct).toBeGreaterThanOrEqual(0);
    expect(report.summary.promptOnly.inBandPct).toBeLessThanOrEqual(1);
    expect(report.summary.rerank.inBandPct).toBeGreaterThanOrEqual(0);
    expect(report.summary.rerank.inBandPct).toBeLessThanOrEqual(1);
  });

  it("demonstrates the re-rank mechanism raising the in-band rate above prompt-only", async () => {
    const report = await runAbHarness({
      corpus: A0_TO_A1_CORPUS,
      vocabByLevel: VOCAB_BY_LEVEL,
      dialect: "pt-PT",
      mode: "mock",
    });
    expect(report.summary.rerank.inBandPct).toBeGreaterThan(report.summary.promptOnly.inBandPct);
  });

  it("renders a markdown report with summary + per-utterance rows", async () => {
    const report = await runAbHarness({
      corpus: A0_TO_A1_CORPUS,
      vocabByLevel: VOCAB_BY_LEVEL,
      dialect: "pt-PT",
      mode: "mock",
    });
    const markdown = formatAbReport(report);

    expect(markdown).toMatch(/^# Difficulty-control A\/B harness report/m);
    expect(markdown).toMatch(/Utterances scored: 100/);
    expect(markdown).toMatch(/Target CEFR level: \*\*A0\*\*/);
    expect(markdown).toMatch(/Prompt-only \| .* \| .*% \|/);
    expect(markdown).toMatch(/Re-ranked \| .* \| .*% \|/);
    expect(markdown).toMatch(/\| 1 \| olá \| greeting \|/);
    expect(markdown).toMatch(/mocked LLM/);
  });

  it("writes the report to tmp/difficulty-ab-report.md for the pedagogy lead", async () => {
    const report = await runAbHarness({
      corpus: A0_TO_A1_CORPUS,
      vocabByLevel: VOCAB_BY_LEVEL,
      dialect: "pt-PT",
      mode: "mock",
    });
    const markdown = formatAbReport(report);

    mkdirSync(join(process.cwd(), "tmp"), { recursive: true });
    writeFileSync(REPORT_PATH, markdown, "utf8");

    expect(existsSync(REPORT_PATH)).toBe(true);
    expect(markdown.length).toBeGreaterThan(2_000);
  });
});