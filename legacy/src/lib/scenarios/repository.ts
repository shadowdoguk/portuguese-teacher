import type { PrismaClient } from "@prisma/client";
import type { ScenarioCompletion } from "./library";
import { createSrsService } from "@/lib/srs/service";
import {
  emptySnapshot,
  type ScenarioProgress,
  type ScenarioStoreSnapshot,
  recordCompletion,
} from "./store";

export type ScenarioRepository = {
  loadSnapshot(learnerId: string): Promise<ScenarioStoreSnapshot>;
  recordCompletion(
    learnerId: string,
    completion: ScenarioCompletion,
    options?: { vocabularyRefs?: ReadonlyArray<string> },
  ): Promise<{
    snapshot: ScenarioStoreSnapshot;
    progress: ScenarioProgress;
    recordedSources: number;
  }>;
  loadHistory(learnerId: string, limit: number): Promise<ReadonlyArray<ScenarioCompletion>>;
};

export function createScenarioRepository(prisma: PrismaClient): ScenarioRepository {
  return {
    async loadSnapshot(learnerId) {
      const rows = await prisma.scenarioProgress.findMany({ where: { learnerId } });
      if (rows.length === 0) return emptySnapshot();
      const byId: Record<string, ScenarioProgress> = {};
      for (const row of rows) {
        byId[row.scenarioId] = rowToProgress(row);
      }
      return { byId, lastUpdatedAt: 0 };
    },

    async recordCompletion(learnerId, completion, options) {
      await prisma.scenarioCompletion.create({
        data: {
          learnerId,
          scenarioId: completion.scenarioId,
          passed: completion.passed,
          stars: completion.stars,
          turnsTaken: completion.turnsTaken,
          completedAt: new Date(completion.completedAt),
        },
      });
      const previous = await prisma.scenarioProgress.findUnique({
        where: { learnerId_scenarioId: { learnerId, scenarioId: completion.scenarioId } },
      });
      const bestStars = previous
        ? Math.max(previous.bestStars, completion.stars)
        : completion.stars;
      const attempts = (previous?.attempts ?? 0) + 1;
      const updated = await prisma.scenarioProgress.upsert({
        where: { learnerId_scenarioId: { learnerId, scenarioId: completion.scenarioId } },
        create: {
          learnerId,
          scenarioId: completion.scenarioId,
          bestStars,
          attempts,
          completedAt: new Date(completion.completedAt),
        },
        update: {
          bestStars,
          attempts,
          completedAt: new Date(completion.completedAt),
        },
      });
      const progress: ScenarioProgress = {
        scenarioId: updated.scenarioId,
        completedAt: updated.completedAt ? updated.completedAt.getTime() : undefined,
        bestStars: clampStars(updated.bestStars),
        attempts: updated.attempts,
      };
      const snapshot = recordCompletion(emptySnapshot(), completion);

      const refs = options?.vocabularyRefs ?? [];
      const recordedSources = await createSrsService(prisma).recordScenarioSources(
        learnerId,
        completion.scenarioId,
        refs,
      );
      return { snapshot, progress, recordedSources };
    },

    async loadHistory(learnerId, limit) {
      const rows = await prisma.scenarioCompletion.findMany({
        where: { learnerId },
        orderBy: { completedAt: "desc" },
        take: limit,
      });
      return rows.map(rowToCompletion);
    },
  };
}

function rowToProgress(row: {
  scenarioId: string;
  bestStars: number;
  attempts: number;
  completedAt: Date | null;
}): ScenarioProgress {
  return {
    scenarioId: row.scenarioId,
    bestStars: clampStars(row.bestStars),
    attempts: row.attempts,
    completedAt: row.completedAt ? row.completedAt.getTime() : undefined,
  };
}

function rowToCompletion(row: {
  scenarioId: string;
  passed: boolean;
  stars: number;
  turnsTaken: number;
  completedAt: Date;
}): ScenarioCompletion {
  return {
    scenarioId: row.scenarioId,
    passed: row.passed,
    stars: clampStars(row.stars),
    turnsTaken: row.turnsTaken,
    completedAt: row.completedAt.getTime(),
  };
}

function clampStars(value: number): 0 | 1 | 2 | 3 {
  if (!Number.isFinite(value) || value <= 0) return 0;
  if (value >= 3) return 3;
  if (value >= 2) return 2;
  return 1;
}
