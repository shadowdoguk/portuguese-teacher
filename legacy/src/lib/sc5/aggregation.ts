import type { PrismaClient } from "@prisma/client";

export type Sc5WeeklyWerReport = {
  weekStart: Date;
  weekEnd: Date;
  sampleCount: number;
  transcribedCount: number;
  refWords: number;
  edits: number;
  wer: number;
  bucketSummary: Array<{
    bucket: "clean" | "noisy";
    sampleCount: number;
    wer: number;
  }>;
};

export type Sc5HeldOutAsrFn = (audioBlobUrl: string) => Promise<{
  transcript: string;
  confidence: number;
  bucket: "clean" | "noisy";
  refTranscript: string;
}>;

const defaultHeldOutAsr: Sc5HeldOutAsrFn = async () => ({
  transcript: "",
  confidence: 0,
  bucket: "clean",
  refTranscript: "",
});

export type Sc5AggregationOptions = {
  now?: Date;
  heldOutAsr?: Sc5HeldOutAsrFn;
  weekStart?: Date;
};

export type Sc5EditCount = {
  refWords: number;
  edits: number;
};

function computeEdits(reference: string, hypothesis: string): Sc5EditCount {
  const refTokens = reference
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .split(/\s+/)
    .filter((t) => t.length > 0);
  const hypTokens = hypothesis
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .split(/\s+/)
    .filter((t) => t.length > 0);

  const m = refTokens.length;
  const n = hypTokens.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i]![0] = i;
  for (let j = 0; j <= n; j++) dp[0]![j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = refTokens[i - 1] === hypTokens[j - 1] ? 0 : 1;
      dp[i]![j] = Math.min(
        dp[i - 1]![j]! + 1,
        dp[i]![j - 1]! + 1,
        dp[i - 1]![j - 1]! + cost,
      );
    }
  }
  return { refWords: m, edits: dp[m]![n]! };
}

export async function aggregateWeeklyWer(
  prisma: PrismaClient,
  options: Sc5AggregationOptions = {},
): Promise<Sc5WeeklyWerReport> {
  const now = options.now ?? new Date();
  const weekEnd = now;
  const weekStart =
    options.weekStart ?? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const heldOutAsr = options.heldOutAsr ?? defaultHeldOutAsr;

  const samples = await prisma.sc5Sample.findMany({
    where: { createdAt: { gte: weekStart, lt: weekEnd } },
  });

  let refWords = 0;
  let edits = 0;
  let transcribedCount = 0;
  const perBucket: Record<"clean" | "noisy", { refWords: number; edits: number; count: number }> = {
    clean: { refWords: 0, edits: 0, count: 0 },
    noisy: { refWords: 0, edits: 0, count: 0 },
  };

  for (const sample of samples) {
    const ref = await heldOutAsr(sample.audioBlobUrl).catch(() => null);
    if (!ref) continue;
    const counts = computeEdits(ref.refTranscript, ref.transcript);
    refWords += counts.refWords;
    edits += counts.edits;
    transcribedCount++;
    perBucket[ref.bucket].refWords += counts.refWords;
    perBucket[ref.bucket].edits += counts.edits;
    perBucket[ref.bucket].count++;

    if (sample.transcript === null || sample.confidence === null) {
      await prisma.sc5Sample
        .update({
          where: { id: sample.id },
          data: { transcript: ref.transcript, confidence: ref.confidence },
        })
        .catch(() => undefined);
    }
  }

  const wer = refWords === 0 ? 0 : edits / refWords;
  const bucketSummary = (["clean", "noisy"] as const).map((bucket) => ({
    bucket,
    sampleCount: perBucket[bucket].count,
    wer: perBucket[bucket].refWords === 0
      ? 0
      : perBucket[bucket].edits / perBucket[bucket].refWords,
  }));

  return {
    weekStart,
    weekEnd,
    sampleCount: samples.length,
    transcribedCount,
    refWords,
    edits,
    wer,
    bucketSummary,
  };
}