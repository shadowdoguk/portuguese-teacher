#!/usr/bin/env tsx
/**
 * ASR accuracy regression runner (issue #13, NFR-1).
 *
 * Spins up a deterministic pt-PT ASR simulator, runs it over the committed
 * corpus, computes per-bucket WER (clean + noisy), compares against the
 * committed baseline + absolute NFR thresholds, and exits non-zero on any
 * regression > `regressionDelta` or any absolute threshold breach.
 *
 * Usage:
 *   pnpm asr:regress                    # default paths
 *   pnpm asr:regress --update-baseline  # refresh the baseline (run when
 *                                        # a model upgrade intentionally
 *                                        # shifts the WER numbers)
 *
 * This is the v1 slice — without a real pt-PT audio corpus + live MiniMax
 * creds, the simulator models the model's per-word verbatim rate + the
 * hotword biasing seam deterministically. The production WER sampling feed
 * from #16/#35 (SC-5 Sampling Buffer) will layer on top in a v1.1 follow-up.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

import { simulateAsr, type SimulateAsrInput } from "@/lib/asr/simulator";
import {
  computeWer,
  summariseBucket,
  tokenise,
  type BucketSummary,
} from "@/lib/asr/wer";

const __dirname = dirname(fileURLToPath(import.meta.url));

type UtteranceFixture = {
  id: string;
  reference: string;
  hotwords?: ReadonlyArray<string>;
};

type Corpus = {
  version: number;
  dialect: string;
  fixture: string;
  description: string;
  werThresholds: { clean: number; noisy: number; regressionDelta: number };
  buckets: {
    clean: ReadonlyArray<UtteranceFixture>;
    noisy: ReadonlyArray<UtteranceFixture>;
  };
};

type BucketBaseline = {
  wer: number;
  utterances: number;
  totalReferenceWords: number;
  totalEdits: number;
};

type Baseline = {
  version: number;
  fixture: string;
  model: string;
  dialect: string;
  buckets: { clean: BucketBaseline; noisy: BucketBaseline };
  regressionDelta: number;
  notes: string;
};

const DEFAULT_CORPUS_PATH = resolve(__dirname, "asr-regress-corpus.json");
const DEFAULT_BASELINE_PATH = resolve(__dirname, "asr-regress-baseline.json");

function loadJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function padEnd(s: string, n: number): string {
  return s.length >= n ? s : s + " ".repeat(n - s.length);
}

function padStart(s: string, n: number): string {
  return s.length >= n ? s : " ".repeat(n - s.length) + s;
}

function fmtPct(x: number): string {
  return `${(x * 100).toFixed(2)}%`;
}

function runBucket(
  bucket: "clean" | "noisy",
  utterances: ReadonlyArray<UtteranceFixture>,
): BucketSummary {
  const perUtterance = utterances.map((utt) => {
    const simInput: SimulateAsrInput = {
      id: utt.id,
      reference: utt.reference,
      hotwords: utt.hotwords ?? [],
    };
    const result = simulateAsr(simInput, { bucket });
    const refTokens = tokenise(utt.reference);
    const hypTokens = tokenise(result.text);
    const werResult = computeWer(refTokens, hypTokens);
    return { id: utt.id, result: werResult };
  });
  return summariseBucket(bucket, perUtterance);
}

function bucketStatus(
  summary: BucketSummary,
  baseline: BucketBaseline,
  thresholds: { absolute: number; regressionDelta: number },
): { ok: boolean; reason: string } {
  const absoluteBreach = summary.wer > thresholds.absolute;
  const regression = summary.wer - baseline.wer;
  const regressionBreach = regression > thresholds.regressionDelta;
  if (absoluteBreach && regressionBreach) {
    return {
      ok: false,
      reason: `WER ${fmtPct(summary.wer)} breaches absolute ${fmtPct(thresholds.absolute)} AND exceeds baseline ${fmtPct(baseline.wer)} by ${fmtPct(regression)} (>${fmtPct(thresholds.regressionDelta)} delta)`,
    };
  }
  if (absoluteBreach) {
    return {
      ok: false,
      reason: `WER ${fmtPct(summary.wer)} breaches absolute threshold ${fmtPct(thresholds.absolute)}`,
    };
  }
  if (regressionBreach) {
    return {
      ok: false,
      reason: `WER ${fmtPct(summary.wer)} regressed vs baseline ${fmtPct(baseline.wer)} by ${fmtPct(regression)} (>${fmtPct(thresholds.regressionDelta)} delta)`,
    };
  }
  return {
    ok: true,
    reason: `WER ${fmtPct(summary.wer)} ≤ threshold ${fmtPct(thresholds.absolute)}; Δ ${regression >= 0 ? "+" : ""}${fmtPct(regression)} vs baseline ${fmtPct(baseline.wer)}`,
  };
}

function main(argv: ReadonlyArray<string>): number {
  const updateBaseline = argv.includes("--update-baseline");
  const corpusPath = process.env.ASR_CORPUS_PATH
    ? resolve(process.cwd(), process.env.ASR_CORPUS_PATH)
    : DEFAULT_CORPUS_PATH;
  const baselinePath = process.env.ASR_BASELINE_PATH
    ? resolve(process.cwd(), process.env.ASR_BASELINE_PATH)
    : DEFAULT_BASELINE_PATH;

  const corpus = loadJson<Corpus>(corpusPath);
  const baseline = loadJson<Baseline>(baselinePath);

  if (corpus.fixture !== baseline.fixture) {
    console.error(
      `[asr-regress] fixture mismatch: corpus=${corpus.fixture} baseline=${baseline.fixture}`,
    );
    return 2;
  }
  if (corpus.dialect !== "pt-PT") {
    console.error(`[asr-regress] non-pt-PT dialect detected: ${corpus.dialect}`);
    return 2;
  }

  const clean = runBucket("clean", corpus.buckets.clean);
  const noisy = runBucket("noisy", corpus.buckets.noisy);
  const cleanStatus = bucketStatus(clean, baseline.buckets.clean, {
    absolute: corpus.werThresholds.clean,
    regressionDelta: corpus.werThresholds.regressionDelta,
  });
  const noisyStatus = bucketStatus(noisy, baseline.buckets.noisy, {
    absolute: corpus.werThresholds.noisy,
    regressionDelta: corpus.werThresholds.regressionDelta,
  });

  console.log("\nASR accuracy regression suite (issue #13, NFR-1)");
  console.log("=".repeat(72));
  console.log(`Corpus:        ${corpusPath}`);
  console.log(`Baseline:      ${baselinePath}`);
  console.log(`Dialect:       ${corpus.dialect}`);
  console.log(`Fixture:       ${corpus.fixture} (synthetic v1; real audio corpus is v1.1)`);
  console.log("");
  console.log(
    `${padEnd("Bucket", 10)}${padStart("Utterances", 12)}${padStart("RefWords", 11)}${padStart("Edits", 8)}${padStart("WER", 10)}${padStart("Baseline", 11)}${padStart("Δ", 8)}  Status`,
  );
  console.log("-".repeat(80));

  for (const [summary, base, status] of [
    [clean, baseline.buckets.clean, cleanStatus] as const,
    [noisy, baseline.buckets.noisy, noisyStatus] as const,
  ]) {
    const delta = summary.wer - base.wer;
    console.log(
      `${padEnd(summary.bucket, 10)}${padStart(String(summary.utterances), 12)}${padStart(String(summary.totalReferenceWords), 11)}${padStart(String(summary.totalEdits), 8)}${padStart(fmtPct(summary.wer), 10)}${padStart(fmtPct(base.wer), 11)}${padStart((delta >= 0 ? "+" : "") + fmtPct(delta), 8)}  ${status.ok ? "OK" : "FAIL"}`,
    );
  }

  console.log("");
  console.log(`clean: ${cleanStatus.reason}`);
  console.log(`noisy: ${noisyStatus.reason}`);

  if (updateBaseline) {
    const updated: Baseline = {
      ...baseline,
      version: baseline.version + 1,
      buckets: {
        clean: {
          wer: clean.wer,
          utterances: clean.utterances,
          totalReferenceWords: clean.totalReferenceWords,
          totalEdits: clean.totalEdits,
        },
        noisy: {
          wer: noisy.wer,
          utterances: noisy.utterances,
          totalReferenceWords: noisy.totalReferenceWords,
          totalEdits: noisy.totalEdits,
        },
      },
    };
    const { writeFileSync } = require("node:fs") as typeof import("node:fs");
    writeFileSync(baselinePath, JSON.stringify(updated, null, 2) + "\n", "utf8");
    console.log(`\n[asr-regress] baseline updated → ${baselinePath}`);
    return 0;
  }

  const ok = cleanStatus.ok && noisyStatus.ok;
  console.log("");
  if (ok) {
    console.log(`[asr-regress] PASS — clean WER ≤ ${fmtPct(corpus.werThresholds.clean)}, noisy WER ≤ ${fmtPct(corpus.werThresholds.noisy)}`);
    return 0;
  }
  console.error(`[asr-regress] FAIL — at least one bucket breaches its threshold or regressed > ${fmtPct(corpus.werThresholds.regressionDelta)}`);
  return 1;
}

const code = main(process.argv.slice(2));
process.exit(code);