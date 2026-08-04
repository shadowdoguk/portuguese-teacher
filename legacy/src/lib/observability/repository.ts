import type { PrismaClient } from "@prisma/client";
import type { LatencyStage } from "./sink";
import type { LatencySample } from "./sli";

export type LatencyRepository = {
  recordSamples(samples: ReadonlyArray<LatencySample>): Promise<{ written: number }>;
  loadSamples(args: {
    since: number;
    until?: number;
    stages?: ReadonlyArray<LatencyStage>;
    learnerId?: string;
    tier?: 1 | 2 | 3;
    practiceMode?: "free-form" | "scenario" | "drill";
    limit?: number;
  }): Promise<ReadonlyArray<LatencySample>>;
  pruneOlderThan(cutoff: number): Promise<{ deleted: number }>;
  count(): Promise<number>;
};

const DEFAULT_LIMIT = 5_000;
const MAX_LIMIT = 50_000;

export function createLatencyRepository(prisma: PrismaClient): LatencyRepository {
  return {
    async recordSamples(samples) {
      if (samples.length === 0) return { written: 0 };
      const data = samples.map((sample) => ({
        stage: sample.stage,
        latencyMs: sample.latencyMs,
        occurredAt: new Date(sample.occurredAt),
        ok: sample.ok,
        learnerId: sample.learnerId ?? null,
        tier: sample.tier ?? null,
        practiceMode: sample.practiceMode ?? null,
      }));
      const result = await prisma.voiceLoopLatencySample.createMany({ data });
      return { written: result.count };
    },

    async loadSamples(args) {
      const limit = Math.min(MAX_LIMIT, args.limit ?? DEFAULT_LIMIT);
      const where: {
        occurredAt: { gte: Date; lte?: Date };
        stage?: { in: LatencyStage[] };
        learnerId?: string;
        tier?: number;
        practiceMode?: string;
      } = {
        occurredAt: { gte: new Date(args.since) },
      };
      if (args.until !== undefined) {
        where.occurredAt.lte = new Date(args.until);
      }
      if (args.stages !== undefined && args.stages.length > 0) {
        where.stage = { in: [...args.stages] };
      }
      if (args.learnerId !== undefined) {
        where.learnerId = args.learnerId;
      }
      if (args.tier !== undefined) {
        where.tier = args.tier;
      }
      if (args.practiceMode !== undefined) {
        where.practiceMode = args.practiceMode;
      }
      const rows = await prisma.voiceLoopLatencySample.findMany({
        where,
        orderBy: { occurredAt: "desc" },
        take: limit,
      });
      return rows.map((row) => ({
        stage: row.stage as LatencyStage,
        latencyMs: row.latencyMs,
        occurredAt: row.occurredAt.getTime(),
        ok: row.ok,
        learnerId: row.learnerId ?? undefined,
        tier: row.tier === null ? undefined : ((row.tier as 1 | 2 | 3)),
        practiceMode:
          row.practiceMode === null
            ? undefined
            : ((row.practiceMode as "free-form" | "scenario" | "drill")),
      }));
    },

    async pruneOlderThan(cutoff) {
      const result = await prisma.voiceLoopLatencySample.deleteMany({
        where: { occurredAt: { lt: new Date(cutoff) } },
      });
      return { deleted: result.count };
    },

    async count() {
      return prisma.voiceLoopLatencySample.count();
    },
  };
}