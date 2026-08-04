#!/usr/bin/env node
/**
 * Live A/B harness runner — invokes the re-rank pipeline against a real
 * MiniMax LLM and writes the markdown report to `tmp/difficulty-ab-report.md`.
 *
 * Usage:
 *   MINIMAX_LLM_BASE_URL=... MINIMAX_LLM_API_KEY=... pnpm harness:live
 *
 * The harness iterates over the A0→A1, A1→A2, and A2→B1 corpora (300 entries
 * total) at the i+1 target for each ladder rung. Acceptance from issue #6:
 * ≥ 75% in-band at A0 target with a real MiniMax LLM.
 */
import { writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

const { runAbHarness, formatAbReport } = await import("../src/lib/voice-loop/ab-harness.ts");
const { ALL_AB_CORPORA } = await import("../src/lib/voice-loop/ab-corpus.ts");
const { vocabularyFor } = await import("../src/lib/voice-loop/level-vocabulary.ts");
const { buildLiveHarnessFromEnv, LiveHarnessError } = await import(
  "../src/lib/voice-loop/live-llm-adapter.ts"
);

async function main() {
  let handle;
  try {
    handle = buildLiveHarnessFromEnv();
  } catch (err) {
    if (err instanceof LiveHarnessError) {
      console.error(`Live harness not configured: ${err.message}`);
      process.exit(2);
    }
    throw err;
  }

  const vocabByLevel = {
    A0: vocabularyFor("A0"),
    A1: vocabularyFor("A1"),
    A2: vocabularyFor("A2"),
    B1: vocabularyFor("B1"),
  };

  const reports = [];
  for (const corpus of ALL_AB_CORPORA) {
    console.error(`Running live harness on ${corpus.targetLevel} → next (${corpus.entries.length} utterances)`);
    const report = await runAbHarness({
      corpus,
      vocabByLevel,
      dialect: "pt-PT",
      mode: "live",
      livePromptOnlyLlm: {
        __kind: "live",
        callLive: handle.promptOnlyLlm,
      },
      liveRerankLlm: handle.rerankLlm,
    });
    reports.push(report);
  }

  const markdown = reports
    .map((r) => formatAbReport(r))
    .join("\n---\n\n");
  const target = process.env.HARNESS_OUTPUT ?? "tmp/difficulty-ab-report.md";
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, markdown, "utf8");
  console.error(`Wrote live report to ${target}`);

  for (const report of reports) {
    const pct = (report.summary.rerank.inBandPct * 100).toFixed(1);
    console.error(
      `[${report.summary.targetLevel}] re-rank in-band: ${pct}% (mean score ${report.summary.rerank.meanScore.toFixed(3)})`,
    );
  }
}

main().catch((err) => {
  console.error("Live harness failed:", err);
  process.exit(1);
});
