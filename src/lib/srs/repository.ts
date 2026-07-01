import type { PrismaClient } from "@prisma/client";
import { emptyState, type SrsState } from "./scheduler";
import {
  type RecallGrade,
  type SrsItemKind,
  type SrsRecallEvent,
  type SrsReviewRecord,
} from "./types";

export type SrsItemSource = {
  itemId: string;
  sourceScenarioId: string;
  recordedAt: number;
};

export type WriteRecordInput = {
  learnerId: string;
  itemId: string;
  kind: SrsItemKind;
  record: SrsReviewRecord;
};

export type AppendEventInput = {
  learnerId: string;
  itemId: string;
  grade: RecallGrade;
  event: SrsRecallEvent;
};

export type ApplyRecallInput = AppendEventInput & {
  kind: SrsItemKind;
  record: SrsReviewRecord;
};

export type SrsRepository = {
  loadState(learnerId: string): Promise<SrsState>;
  writeRecord(input: WriteRecordInput): Promise<void>;
  appendEvent(input: AppendEventInput): Promise<void>;
  applyRecall(input: ApplyRecallInput): Promise<{
    record: SrsReviewRecord;
    event: SrsRecallEvent;
  }>;
  loadRecentEvents(learnerId: string, limit: number): Promise<ReadonlyArray<SrsRecallEvent>>;
  loadRecentMistakes(
    learnerId: string,
    sinceMs: number,
    limit: number,
  ): Promise<ReadonlyArray<SrsRecallEvent>>;
  loadItemKind(learnerId: string, itemId: string): Promise<SrsItemKind | null>;
  recordScenarioSources(
    learnerId: string,
    sources: ReadonlyArray<{ itemId: string; sourceScenarioId: string }>,
  ): Promise<number>;
  loadScenarioSources(learnerId: string): Promise<ReadonlyArray<SrsItemSource>>;
};

export function createSrsRepository(prisma: PrismaClient): SrsRepository {
  return {
    async loadState(learnerId) {
      const rows = await prisma.srsReviewRecord.findMany({ where: { learnerId } });
      if (rows.length === 0) return emptyState();
      const items: Record<string, SrsReviewRecord> = {};
      for (const row of rows) {
        items[row.itemId] = rowToRecord(row);
      }
      return { items };
    },

    async writeRecord({ learnerId, itemId, kind, record }) {
      await prisma.srsReviewRecord.upsert({
        where: { learnerId_itemId: { learnerId, itemId } },
        create: {
          learnerId,
          itemId,
          kind,
          halfLifeMs: record.halfLifeMs,
          lastReviewedAt:
            typeof record.lastReviewedAt === "number" ? new Date(record.lastReviewedAt) : null,
          dueAt: new Date(record.dueAt),
          reviewCount: record.reviewCount,
          lapses: record.lapses,
        },
        update: {
          halfLifeMs: record.halfLifeMs,
          lastReviewedAt:
            typeof record.lastReviewedAt === "number" ? new Date(record.lastReviewedAt) : null,
          dueAt: new Date(record.dueAt),
          reviewCount: record.reviewCount,
          lapses: record.lapses,
        },
      });
    },

    async appendEvent({ learnerId, itemId, grade, event }) {
      await prisma.srsRecallEvent.create({
        data: {
          learnerId,
          itemId,
          grade,
          halfLifeBeforeMs: event.halfLifeBeforeMs,
          halfLifeAfterMs: event.halfLifeAfterMs,
          dueAt: new Date(event.dueAt),
          occurredAt: new Date(event.timestamp),
        },
      });
    },

    async applyRecall(input) {
      const { learnerId, itemId, kind, grade, record, event } = input;
      await prisma.srsReviewRecord.upsert({
        where: { learnerId_itemId: { learnerId, itemId } },
        create: {
          learnerId,
          itemId,
          kind,
          halfLifeMs: record.halfLifeMs,
          lastReviewedAt:
            typeof record.lastReviewedAt === "number" ? new Date(record.lastReviewedAt) : null,
          dueAt: new Date(record.dueAt),
          reviewCount: record.reviewCount,
          lapses: record.lapses,
        },
        update: {
          halfLifeMs: record.halfLifeMs,
          lastReviewedAt:
            typeof record.lastReviewedAt === "number" ? new Date(record.lastReviewedAt) : null,
          dueAt: new Date(record.dueAt),
          reviewCount: record.reviewCount,
          lapses: record.lapses,
        },
      });
      await prisma.srsRecallEvent.create({
        data: {
          learnerId,
          itemId,
          grade,
          halfLifeBeforeMs: event.halfLifeBeforeMs,
          halfLifeAfterMs: event.halfLifeAfterMs,
          dueAt: new Date(event.dueAt),
          occurredAt: new Date(event.timestamp),
        },
      });
      return {
        record,
        event: { ...event, event: "srs_recall" as const },
      };
    },

    async loadRecentEvents(learnerId, limit) {
      const rows = await prisma.srsRecallEvent.findMany({
        where: { learnerId },
        orderBy: { occurredAt: "desc" },
        take: limit,
      });
      return rows.map(rowToEvent);
    },

    async loadRecentMistakes(learnerId, sinceMs, limit) {
      // DB-level filter for grade='again' AND occurredAt >= sinceMs so the
      // route never pulls + discards thousands of good/easy rows. Pushed
      // down here as part of #102 (post-#109) — keeps the cap meaningful
      // for heavy users and removes the JS-side filter cost.
      const rows = await prisma.srsRecallEvent.findMany({
        where: { learnerId, grade: "again", occurredAt: { gte: new Date(sinceMs) } },
        orderBy: { occurredAt: "desc" },
        take: limit,
      });
      return rows.map(rowToEvent);
    },

    async loadItemKind(learnerId, itemId): Promise<SrsItemKind | null> {
      const row = await prisma.srsReviewRecord.findUnique({
        where: { learnerId_itemId: { learnerId, itemId } },
        select: { kind: true },
      });
      return (row?.kind as SrsItemKind | undefined) ?? null;
    },

    async recordScenarioSources(learnerId, sources) {
      let recorded = 0;
      for (const source of sources) {
        if (typeof source.itemId !== "string" || source.itemId.length === 0) continue;
        await prisma.srsItemSource.upsert({
          where: {
            learnerId_itemId_sourceScenarioId: {
              learnerId,
              itemId: source.itemId,
              sourceScenarioId: source.sourceScenarioId,
            },
          },
          create: {
            learnerId,
            itemId: source.itemId,
            sourceScenarioId: source.sourceScenarioId,
          },
          update: {},
        });
        recorded += 1;
      }
      return recorded;
    },

    async loadScenarioSources(learnerId) {
      const rows = await prisma.srsItemSource.findMany({
        where: { learnerId },
        orderBy: { recordedAt: "desc" },
      });
      return rows.map((row) => ({
        itemId: row.itemId,
        sourceScenarioId: row.sourceScenarioId,
        recordedAt: row.recordedAt.getTime(),
      }));
    },
  };
}

export function rowToRecord(row: {
  itemId: string;
  halfLifeMs: number;
  lastReviewedAt: Date | null;
  dueAt: Date;
  reviewCount: number;
  lapses: number;
}): SrsReviewRecord {
  return {
    itemId: row.itemId,
    halfLifeMs: row.halfLifeMs,
    lastReviewedAt: row.lastReviewedAt ? row.lastReviewedAt.getTime() : null,
    dueAt: row.dueAt.getTime(),
    reviewCount: row.reviewCount,
    lapses: row.lapses,
  };
}

export function rowToEvent(row: {
  learnerId: string;
  itemId: string;
  grade: string;
  halfLifeBeforeMs: number;
  halfLifeAfterMs: number;
  dueAt: Date;
  occurredAt: Date;
}): SrsRecallEvent {
  return {
    event: "srs_recall",
    learnerId: row.learnerId,
    itemId: row.itemId,
    grade: row.grade as RecallGrade,
    halfLifeBeforeMs: row.halfLifeBeforeMs,
    halfLifeAfterMs: row.halfLifeAfterMs,
    dueAt: row.dueAt.getTime(),
    timestamp: row.occurredAt.getTime(),
  };
}
