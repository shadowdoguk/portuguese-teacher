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

export type SrsRepository = {
  loadState(learnerId: string): Promise<SrsState>;
  upsertRecords(learnerId: string, records: ReadonlyArray<SrsReviewRecord>): Promise<void>;
  applyRecall(args: {
    learnerId: string;
    itemId: string;
    kind: SrsItemKind;
    grade: RecallGrade;
    record: SrsReviewRecord;
    event: SrsRecallEvent;
  }): Promise<{ record: SrsReviewRecord; event: SrsRecallEvent }>;
  loadRecentEvents(learnerId: string, limit: number): Promise<ReadonlyArray<SrsRecallEvent>>;
  recordScenarioSources(
    learnerId: string,
    sources: ReadonlyArray<{ itemId: string; sourceScenarioId: string }>,
  ): Promise<void>;
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

    async upsertRecords(learnerId, records) {
      for (const record of records) {
        await prisma.srsReviewRecord.upsert({
          where: { learnerId_itemId: { learnerId, itemId: record.itemId } },
          create: {
            learnerId,
            itemId: record.itemId,
            kind: inferKindFromId(record.itemId),
            halfLifeMs: record.halfLifeMs,
            lastReviewedAt:
              typeof record.lastReviewedAt === "number"
                ? new Date(record.lastReviewedAt)
                : null,
            dueAt: new Date(record.dueAt),
            reviewCount: record.reviewCount,
            lapses: record.lapses,
          },
          update: {
            halfLifeMs: record.halfLifeMs,
            lastReviewedAt:
              typeof record.lastReviewedAt === "number"
                ? new Date(record.lastReviewedAt)
                : null,
            dueAt: new Date(record.dueAt),
            reviewCount: record.reviewCount,
            lapses: record.lapses,
          },
        });
      }
    },

    async applyRecall(args) {
      const { learnerId, itemId, kind, grade, record, event } = args;
      await prisma.srsReviewRecord.upsert({
        where: { learnerId_itemId: { learnerId, itemId } },
        create: {
          learnerId,
          itemId,
          kind,
          halfLifeMs: record.halfLifeMs,
          lastReviewedAt:
            typeof record.lastReviewedAt === "number"
              ? new Date(record.lastReviewedAt)
              : null,
          dueAt: new Date(record.dueAt),
          reviewCount: record.reviewCount,
          lapses: record.lapses,
        },
        update: {
          halfLifeMs: record.halfLifeMs,
          lastReviewedAt:
            typeof record.lastReviewedAt === "number"
              ? new Date(record.lastReviewedAt)
              : null,
          dueAt: new Date(record.dueAt),
          reviewCount: record.reviewCount,
          lapses: record.lapses,
        },
      });
      const persisted = await prisma.srsRecallEvent.create({
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
        event: {
          ...event,
          event: "srs_recall" as const,
        },
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

    async recordScenarioSources(learnerId, sources) {
      for (const source of sources) {
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
      }
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

function inferKindFromId(itemId: string): SrsItemKind {
  return itemId.startsWith("grammar-") ? "grammar" : "vocabulary";
}