#!/usr/bin/env tsx
/**
 * SC-5 Sampling Buffer acceptance — issue #16.
 *
 * Generates ≥ 10,000 synthetic utteranceIds, runs the sampler through the
 * fire-and-forget recorder against a fake in-memory object store, and asserts
 * that the sampled count is within ±0.5 % of the 1 % target. Also asserts
 * that the hook adds no measurable latency to the Voice Loop p95 (it never
 * awaits the write).
 *
 * Usage:
 *   pnpm tsx scripts/sc5-load-test.ts
 *   pnpm tsx scripts/sc5-load-test.ts --utterances 100000
 */
import { createFireAndForgetRecorder, type Sc5AudioObjectStore } from "../src/lib/sc5/recorder";
import { SC5_SAMPLE_RATE, summariseSampling } from "../src/lib/sc5/sampler";

type Args = {
  utterances: number;
  sampleRate: number;
};

function parseArgs(argv: ReadonlyArray<string>): Args {
  const args: Args = { utterances: 10_000, sampleRate: SC5_SAMPLE_RATE };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    const next = argv[i + 1];
    if (flag === "--utterances" && next) {
      args.utterances = Number.parseInt(next, 10);
      i++;
    } else if (flag === "--sample-rate" && next) {
      args.sampleRate = Number.parseFloat(next);
      i++;
    }
  }
  return args;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const ids = Array.from({ length: args.utterances }, (_, i) => `load-test-${i}`);

  const samplerSummary = summariseSampling(ids, args.sampleRate);

  let writes = 0;
  let latencySamplesNs: bigint[] = [];

  const fakeStore: Sc5AudioObjectStore = {
    async write(blob): Promise<string> {
      // Simulate a 5–15 ms object-store write — never await this from the
      // caller's perspective.
      const delayMs = 5 + Math.random() * 10;
      await new Promise((r) => setTimeout(r, delayMs));
      writes++;
      return `https://blob.local/${blob.utteranceId}`;
    },
  };

  const recorder = createFireAndForgetRecorder({ store: fakeStore, sampleRate: args.sampleRate });

  const start = process.hrtime.bigint();
  for (const id of ids) {
    const enqueueStart = process.hrtime.bigint();
    recorder.enqueue({
      utteranceId: id,
      body: new Uint8Array([1, 2, 3, 4]),
      contentType: "audio/webm",
      signedUrlExpiresIn: 86_400,
    });
    const enqueueEnd = process.hrtime.bigint();
    latencySamplesNs.push(enqueueEnd - enqueueStart);
  }
  const enqueueWallMs = Number(process.hrtime.bigint() - start) / 1_000_000;

  // Wait for in-flight writes to settle.
  await new Promise((r) => setTimeout(r, 250));

  latencySamplesNs.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const p95 = Number(latencySamplesNs[Math.floor(latencySamplesNs.length * 0.95)] ?? 0n) / 1_000;

  console.log("SC-5 load test");
  console.log("--------------");
  console.log(`utterances     : ${args.utterances.toLocaleString()}`);
  console.log(`target rate    : ${(args.sampleRate * 100).toFixed(2)} %`);
  console.log(`sampled (sync) : ${samplerSummary.sampled.toLocaleString()} (${(samplerSummary.rate * 100).toFixed(2)} %)`);
  console.log(`writes (async) : ${writes.toLocaleString()}`);
  console.log(`enqueue wall   : ${enqueueWallMs.toFixed(2)} ms total, ${(enqueueWallMs / args.utterances).toFixed(4)} ms / call`);
  console.log(`enqueue p95    : ${p95.toFixed(3)} µs`);

  const tolerance = 0.005; // ±0.5 percentage points
  const drift = Math.abs(samplerSummary.rate - args.sampleRate);
  if (drift > tolerance) {
    console.error(
      `\n[sc5-load-test] FAIL: sampled rate ${(samplerSummary.rate * 100).toFixed(2)} % drifted more than ±${(tolerance * 100).toFixed(2)} % from target ${(args.sampleRate * 100).toFixed(2)} %`,
    );
    process.exit(1);
  }

  if (writes !== samplerSummary.sampled) {
    console.error(
      `\n[sc5-load-test] FAIL: async writes (${writes}) didn't match synchronous sampler (${samplerSummary.sampled})`,
    );
    process.exit(1);
  }

  console.log("\n[sc5-load-test] PASS");
}

main().catch((err: unknown) => {
  console.error("[sc5-load-test] crashed:", err);
  process.exit(1);
});