// Repository split — pin that writeRecord and appendEvent can be called
// independently without violating the data model. This locks in the
// service's compose pattern (loadState → writeRecord + appendEvent in
// parallel) without going through the convenience applyRecall method.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { execSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import {
  applyRecall,
  createSrsRepository,
  emptyState,
  enrollItem,
  type SrsItemRef,
} from "@/lib/srs";

let prisma: PrismaClient;
let tmpDir: string;

beforeAll(async () => {
  tmpDir = mkdtempSync(join(tmpdir(), "pt-srs-repo-split-"));
  const dbPath = join(tmpDir, "test.db");
  process.env.DATABASE_URL = `file:${dbPath}`;
  execSync(`pnpm exec prisma migrate deploy`, {
    env: { ...process.env, DATABASE_URL: `file:${dbPath}` },
    stdio: "pipe",
  });
  prisma = new PrismaClient({ datasources: { db: { url: `file:${dbPath}` } } });
}, 60000);

afterAll(async () => {
  await prisma?.$disconnect();
  if (tmpDir) rmSync(tmpDir, { recursive: true, force: true });
});

const REF: SrsItemRef = {
  kind: "vocabulary",
  itemId: "split-v-ola",
  pt: "olá",
  gloss: "hello",
  unitId: "a0-1",
};

describe("SrsRepository.writeRecord + appendEvent — independent calls", () => {
  it("writeRecord alone creates the row without emitting an event", async () => {
    const learnerId = `learner-${Date.now()}-writeOnly`;
    const repo = createSrsRepository(prisma);
    await repo.writeRecord({
      learnerId,
      itemId: REF.itemId,
      kind: REF.kind,
      record: {
        itemId: REF.itemId,
        halfLifeMs: 600_000,
        lastReviewedAt: null,
        dueAt: 1_700_000_000_000,
        reviewCount: 0,
        lapses: 0,
      },
    });

    const reloaded = await repo.loadState(learnerId);
    expect(reloaded.items[REF.itemId]?.halfLifeMs).toBe(600_000);

    const events = await repo.loadRecentEvents(learnerId, 10);
    expect(events).toEqual([]);
  });

  it("appendEvent alone writes the event row", async () => {
    const learnerId = `learner-${Date.now()}-appendOnly`;
    const repo = createSrsRepository(prisma);
    await repo.appendEvent({
      learnerId,
      itemId: REF.itemId,
      grade: "good",
      event: {
        event: "srs_recall",
        learnerId,
        itemId: REF.itemId,
        grade: "good",
        halfLifeBeforeMs: 600_000,
        halfLifeAfterMs: 1_500_000,
        dueAt: 1_700_000_500_000,
        timestamp: 1_700_000_000_000,
      },
    });

    const events = await repo.loadRecentEvents(learnerId, 10);
    expect(events).toHaveLength(1);
    expect(events[0]?.grade).toBe("good");
  });

  it("composing writeRecord + appendEvent reproduces the applyRecall outcome", async () => {
    const learnerId = `learner-${Date.now()}-compose`;
    const repo = createSrsRepository(prisma);

    const startState = enrollItem(emptyState(), REF, 1_000_000);
    for (const record of Object.values(startState.items)) {
      await repo.writeRecord({ learnerId, itemId: record.itemId, kind: REF.kind, record });
    }

    const schedulerResult = applyRecall(startState, learnerId, REF.itemId, "easy", 2_000_000);
    await Promise.all([
      repo.writeRecord({
        learnerId,
        itemId: REF.itemId,
        kind: REF.kind,
        record: schedulerResult.record,
      }),
      repo.appendEvent({
        learnerId,
        itemId: REF.itemId,
        grade: "easy",
        event: schedulerResult.event,
      }),
    ]);

    const reloaded = await repo.loadState(learnerId);
    expect(reloaded.items[REF.itemId]?.reviewCount).toBe(1);
    expect(reloaded.items[REF.itemId]?.halfLifeMs).toBe(schedulerResult.record.halfLifeMs);

    const events = await repo.loadRecentEvents(learnerId, 10);
    expect(events).toHaveLength(1);
    expect(events[0]?.grade).toBe("easy");
  });
});

describe("SrsRepository dead-code sweep", () => {
  it("does not export upsertRecords or inferKindFromId", () => {
    // The repository module is the single source of truth; importing the
    // module under test should not surface the dead helpers. This pins the
    // contract so a future contributor can't quietly re-introduce them.
    const repositoryModule = createSrsRepository(prisma) as unknown as Record<string, unknown>;
    expect(typeof repositoryModule.upsertRecords).toBe("undefined");
    expect(typeof (repositoryModule as Record<string, unknown>).inferKindFromId).toBe("undefined");
  });
});
