// Repository test: SRS state round-trips through Prisma with the same
// observable shape produced by the in-memory scheduler.
//
// Acceptance for issue #30: "A signed-in Learner's queue is identical across
// two browsers (after they sign in on both)." — covered indirectly: the
// repository can reload state after every apply and produce an equivalent
// in-memory SrsState.

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
  tmpDir = mkdtempSync(join(tmpdir(), "pt-srs-"));
  const dbPath = join(tmpDir, "test.db");
  process.env.DATABASE_URL = `file:${dbPath}`;

  execSync(`pnpm exec prisma migrate deploy`, {
    env: { ...process.env, DATABASE_URL: `file:${dbPath}` },
    stdio: "pipe",
  });

  prisma = new PrismaClient({
    datasources: { db: { url: `file:${dbPath}` } },
  });
}, 60000);

afterAll(async () => {
  await prisma?.$disconnect();
  if (tmpDir) {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

const REF_A: SrsItemRef = {
  kind: "vocabulary",
  itemId: "a0-1-v-ola",
  pt: "olá",
  gloss: "hello",
  unitId: "a0-1-alfabeto-saudacoes",
};

const REF_B: SrsItemRef = {
  kind: "vocabulary",
  itemId: "a0-1-v-adeus",
  pt: "adeus",
  gloss: "goodbye",
  unitId: "a0-1-alfabeto-saudacoes",
};

describe("SrsRepository", () => {
  it("returns an empty state for a fresh learner", async () => {
    const repo = createSrsRepository(prisma);
    const state = await repo.loadState(`learner-${Date.now()}-empty`);
    expect(state).toEqual(emptyState());
  });

  it("writeRecord persists half-life + dueAt + counters", async () => {
    const repo = createSrsRepository(prisma);
    const learnerId = `learner-${Date.now()}-upsert`;
    await repo.writeRecord({
      learnerId,
      itemId: REF_A.itemId,
      kind: REF_A.kind,
      record: {
        itemId: REF_A.itemId,
        halfLifeMs: 600_000,
        lastReviewedAt: null,
        dueAt: 1_700_000_000_000,
        reviewCount: 0,
        lapses: 0,
      },
    });
    const state = await repo.loadState(learnerId);
    expect(Object.keys(state.items)).toHaveLength(1);
    expect(state.items[REF_A.itemId]?.halfLifeMs).toBe(600_000);
    expect(state.items[REF_A.itemId]?.dueAt).toBe(1_700_000_000_000);
  });

  it("applyRecall persists the updated record and emits a recall event", async () => {
    const repo = createSrsRepository(prisma);
    const learnerId = `learner-${Date.now()}-recall`;
    const startState = enrollItem(emptyState(), REF_A, 1_000_000);
    for (const record of Object.values(startState.items)) {
      await repo.writeRecord({
        learnerId,
        itemId: record.itemId,
        kind: REF_A.kind,
        record,
      });
    }

    const result = applyRecall(startState, learnerId, REF_A.itemId, "good", 2_000_000);
    const persisted = await repo.applyRecall({
      learnerId,
      itemId: REF_A.itemId,
      kind: REF_A.kind,
      grade: "good",
      record: result.record,
      event: result.event,
    });

    expect(persisted.record.reviewCount).toBe(1);
    expect(persisted.record.halfLifeMs).toBe(result.record.halfLifeMs);

    const reloaded = await repo.loadState(learnerId);
    expect(reloaded.items[REF_A.itemId]?.reviewCount).toBe(1);
    expect(reloaded.items[REF_A.itemId]?.halfLifeMs).toBe(result.record.halfLifeMs);
    expect(reloaded.items[REF_A.itemId]?.dueAt).toBe(result.record.dueAt);

    const events = await repo.loadRecentEvents(learnerId, 10);
    expect(events).toHaveLength(1);
    expect(events[0]?.itemId).toBe(REF_A.itemId);
    expect(events[0]?.grade).toBe("good");
  });

  it("supports two items per learner", async () => {
    const repo = createSrsRepository(prisma);
    const learnerId = `learner-${Date.now()}-two`;
    let state = emptyState();
    state = enrollItem(state, REF_A, 1_000);
    state = enrollItem(state, REF_B, 1_000);
    for (const record of Object.values(state.items)) {
      const ref = record.itemId === REF_A.itemId ? REF_A : REF_B;
      await repo.writeRecord({
        learnerId,
        itemId: record.itemId,
        kind: ref.kind,
        record,
      });
    }

    const reloaded = await repo.loadState(learnerId);
    expect(Object.keys(reloaded.items).sort()).toEqual(
      [REF_A.itemId, REF_B.itemId].sort(),
    );
  });

  it("two loadState calls for the same learner produce the same record", async () => {
    const repo = createSrsRepository(prisma);
    const learnerId = `learner-${Date.now()}-stable`;
    await repo.writeRecord({
      learnerId,
      itemId: REF_A.itemId,
      kind: REF_A.kind,
      record: {
        itemId: REF_A.itemId,
        halfLifeMs: 1_200_000,
        lastReviewedAt: 5_000,
        dueAt: 1_205_000,
        reviewCount: 3,
        lapses: 1,
      },
    });
    const a = await repo.loadState(learnerId);
    const b = await repo.loadState(learnerId);
    expect(a).toEqual(b);
  });
});