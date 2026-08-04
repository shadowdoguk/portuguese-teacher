// SrsService integration test — pins the consolidation seam from issue #104.
// The service is the single entrypoint through which every server-side SRS
// write flows. This test exercises:
//   - loadState returns state + sources in parallel
//   - recordRecall auto-enrolls when an item is unseen, then applies the
//     scheduler's recall math + persists record + event
//   - recordRecall rejects when enroll.itemId !== itemId (typed carrier)
//   - recordRecall rejects when the item is unknown AND no enroll is sent
//   - recordScenarioSources is idempotent on (learnerId, itemId, scenarioId)
//   - recordScenarioSources returns 0 for an empty itemId list
//   - loadRecentEvents is a passthrough to the repository
//   - The service does NOT derive kind from an itemId prefix (no leak)

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { execSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { createSrsRepository, emptyState, enrollItem, type SrsItemRef } from "@/lib/srs";
import { SrsServiceError, createSrsService, parseRecordRecallRequest } from "@/lib/srs/service";

let prisma: PrismaClient;
let tmpDir: string;

beforeAll(async () => {
  tmpDir = mkdtempSync(join(tmpdir(), "pt-srs-service-"));
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

const REF_VOCAB: SrsItemRef = {
  kind: "vocabulary",
  itemId: "a0-1-v-ola",
  pt: "olá",
  gloss: "hello",
  unitId: "a0-1",
};

const REF_GRAMMAR: SrsItemRef = {
  kind: "grammar",
  itemId: "grammar-ser-present",
  pt: "ser (present)",
  gloss: "to be (present tense)",
  unitId: "a0-1",
};

describe("createSrsService.loadState", () => {
  it("returns an empty state + empty sources for an unseen learner", async () => {
    const service = createSrsService(prisma);
    const bundle = await service.loadState(`learner-${Date.now()}-empty`);
    expect(bundle.state).toEqual(emptyState());
    expect(bundle.sources).toEqual([]);
  });

  it("returns the persisted state plus sources in a single call", async () => {
    const learnerId = `learner-${Date.now()}-bundle`;
    const repo = createSrsRepository(prisma);
    await repo.writeRecord({
      learnerId,
      itemId: REF_VOCAB.itemId,
      kind: REF_VOCAB.kind,
      record: {
        itemId: REF_VOCAB.itemId,
        halfLifeMs: 600_000,
        lastReviewedAt: null,
        dueAt: 1_700_000_000_000,
        reviewCount: 0,
        lapses: 0,
      },
    });
    await repo.recordScenarioSources(learnerId, [
      { itemId: REF_VOCAB.itemId, sourceScenarioId: "s-greetings-1" },
    ]);

    const bundle = await createSrsService(prisma).loadState(learnerId);
    expect(bundle.state.items[REF_VOCAB.itemId]?.halfLifeMs).toBe(600_000);
    expect(bundle.sources).toHaveLength(1);
    expect(bundle.sources[0]?.sourceScenarioId).toBe("s-greetings-1");
  });
});

describe("createSrsService.recordRecall", () => {
  it("applies a recall against an already-enrolled item (no auto-enroll)", async () => {
    const learnerId = `learner-${Date.now()}-known`;
    const repo = createSrsRepository(prisma);
    const startState = enrollItem(emptyState(), REF_VOCAB, 1_000_000);
    await repo.writeRecord({
      learnerId,
      itemId: REF_VOCAB.itemId,
      kind: REF_VOCAB.kind,
      record: startState.items[REF_VOCAB.itemId]!,
    });

    const service = createSrsService(prisma);
    const result = await service.recordRecall({
      learnerId,
      itemId: REF_VOCAB.itemId,
      kind: REF_VOCAB.kind,
      grade: "good",
      now: 1_000_001,
    });
    expect(result.enrolled).toBe(false);
    expect(result.record.reviewCount).toBe(1);
    expect(result.event.grade).toBe("good");

    const reloaded = await service.loadState(learnerId);
    expect(reloaded.state.items[REF_VOCAB.itemId]?.reviewCount).toBe(1);
  });

  it("auto-enrolls on first recall when enroll is provided", async () => {
    const learnerId = `learner-${Date.now()}-first`;
    const service = createSrsService(prisma);
    const result = await service.recordRecall({
      learnerId,
      itemId: REF_VOCAB.itemId,
      kind: REF_VOCAB.kind,
      grade: "easy",
      now: 1_700_000_000_000,
      enroll: {
        kind: REF_VOCAB.kind,
        itemId: REF_VOCAB.itemId,
        pt: REF_VOCAB.pt,
        gloss: REF_VOCAB.gloss,
        unitId: REF_VOCAB.unitId,
      },
    });
    expect(result.enrolled).toBe(true);
    expect(result.record.reviewCount).toBe(1);

    const reloaded = await service.loadState(learnerId);
    expect(reloaded.state.items[REF_VOCAB.itemId]?.reviewCount).toBe(1);
  });

  it("carries kind through the typed input — no itemId prefix inference", async () => {
    const learnerId = `learner-${Date.now()}-grammar`;
    const service = createSrsService(prisma);
    await service.recordRecall({
      learnerId,
      itemId: REF_GRAMMAR.itemId,
      kind: REF_GRAMMAR.kind,
      grade: "good",
      now: 1_700_000_001_000,
      enroll: {
        kind: REF_GRAMMAR.kind,
        itemId: REF_GRAMMAR.itemId,
        pt: REF_GRAMMAR.pt,
        gloss: REF_GRAMMAR.gloss,
        unitId: REF_GRAMMAR.unitId,
      },
    });

    const row = await prisma.srsReviewRecord.findUnique({
      where: { learnerId_itemId: { learnerId, itemId: REF_GRAMMAR.itemId } },
    });
    expect(row?.kind).toBe("grammar");
  });

  it("returns a queue of due items when refs are provided", async () => {
    const learnerId = `learner-${Date.now()}-queue`;
    const service = createSrsService(prisma);
    await service.recordRecall({
      learnerId,
      itemId: REF_VOCAB.itemId,
      kind: REF_VOCAB.kind,
      grade: "good",
      now: 1_700_000_000_000,
      enroll: {
        kind: REF_VOCAB.kind,
        itemId: REF_VOCAB.itemId,
        pt: REF_VOCAB.pt,
        gloss: REF_VOCAB.gloss,
        unitId: REF_VOCAB.unitId,
      },
      refs: [REF_VOCAB],
    });

    const result = await service.recordRecall({
      learnerId,
      itemId: REF_VOCAB.itemId,
      kind: REF_VOCAB.kind,
      grade: "good",
      now: 1_700_000_001_000,
      refs: [REF_VOCAB],
    });
    expect(Array.isArray(result.queue)).toBe(true);
    expect(result.queue.every((entry) => typeof entry.itemId === "string")).toBe(true);
  });

  it("rejects when the item is unknown AND no enroll is supplied", async () => {
    const learnerId = `learner-${Date.now()}-404`;
    const service = createSrsService(prisma);
    await expect(
      service.recordRecall({
        learnerId,
        itemId: "ghost-item",
        kind: "vocabulary",
        grade: "good",
      }),
    ).rejects.toMatchObject({
      name: "SrsServiceError",
      code: "UNKNOWN_ITEM",
    });
  });

  it("rejects when enroll.itemId does not match itemId", async () => {
    const learnerId = `learner-${Date.now()}-mismatch`;
    const service = createSrsService(prisma);
    await expect(
      service.recordRecall({
        learnerId,
        itemId: "first-item",
        kind: "vocabulary",
        grade: "good",
        enroll: {
          kind: "vocabulary",
          itemId: "different-item",
          pt: "x",
          gloss: "y",
          unitId: "a0-1",
        },
      }),
    ).rejects.toBeInstanceOf(SrsServiceError);
  });

  it("persists an srs_recall event for every recall", async () => {
    const learnerId = `learner-${Date.now()}-event`;
    const service = createSrsService(prisma);
    await service.recordRecall({
      learnerId,
      itemId: REF_VOCAB.itemId,
      kind: REF_VOCAB.kind,
      grade: "hard",
      now: 1_700_000_000_000,
      enroll: {
        kind: REF_VOCAB.kind,
        itemId: REF_VOCAB.itemId,
        pt: REF_VOCAB.pt,
        gloss: REF_VOCAB.gloss,
        unitId: REF_VOCAB.unitId,
      },
    });

    const events = await prisma.srsRecallEvent.findMany({ where: { learnerId } });
    expect(events).toHaveLength(1);
    expect(events[0]?.grade).toBe("hard");
    expect(events[0]?.halfLifeAfterMs).toBe(events[0]?.halfLifeBeforeMs! * 0.5);
  });
});

describe("createSrsService.recordScenarioSources", () => {
  it("records one row per (learnerId, itemId, scenarioId) triple", async () => {
    const learnerId = `learner-${Date.now()}-sources`;
    const service = createSrsService(prisma);
    const recorded = await service.recordScenarioSources(learnerId, "s-cafe-1-pedir-basico", [
      "a0-3-v-agua",
      "a0-3-v-cafe",
    ]);
    expect(recorded).toBe(2);

    const rows = await prisma.srsItemSource.findMany({ where: { learnerId } });
    expect(rows).toHaveLength(2);
    const ids = rows.map((r) => r.itemId).sort();
    expect(ids).toEqual(["a0-3-v-agua", "a0-3-v-cafe"]);
  });

  it("is idempotent — calling twice produces the same row count", async () => {
    const learnerId = `learner-${Date.now()}-idem`;
    const service = createSrsService(prisma);
    const first = await service.recordScenarioSources(learnerId, "s-cafe-1-pedir-basico", [
      "a0-3-v-agua",
      "a0-3-v-cafe",
    ]);
    const second = await service.recordScenarioSources(learnerId, "s-cafe-1-pedir-basico", [
      "a0-3-v-agua",
      "a0-3-v-cafe",
    ]);
    expect(first).toBe(2);
    expect(second).toBe(2);

    const rows = await prisma.srsItemSource.findMany({ where: { learnerId } });
    expect(rows).toHaveLength(2);
  });

  it("returns 0 and writes nothing for an empty itemIds list", async () => {
    const learnerId = `learner-${Date.now()}-empty-sources`;
    const service = createSrsService(prisma);
    const recorded = await service.recordScenarioSources(learnerId, "s-empty", []);
    expect(recorded).toBe(0);

    const rows = await prisma.srsItemSource.findMany({ where: { learnerId } });
    expect(rows).toEqual([]);
  });

  it("rejects an empty scenarioId", async () => {
    const learnerId = `learner-${Date.now()}-no-scenario`;
    const service = createSrsService(prisma);
    await expect(
      service.recordScenarioSources(learnerId, "", ["a0-3-v-agua"]),
    ).rejects.toBeInstanceOf(SrsServiceError);
  });

  it("filters out non-string itemIds without throwing", async () => {
    const learnerId = `learner-${Date.now()}-mixed`;
    const service = createSrsService(prisma);
    // Pass a heterogeneous list — only strings survive.
    const recorded = await (
      service.recordScenarioSources as unknown as (
        l: string,
        s: string,
        ids: ReadonlyArray<unknown>,
      ) => Promise<number>
    )(learnerId, "s-mixed", ["a0-3-v-agua", null as unknown as string, 42 as unknown as string]);
    expect(recorded).toBe(1);

    const rows = await prisma.srsItemSource.findMany({ where: { learnerId } });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.itemId).toBe("a0-3-v-agua");
  });
});

describe("createSrsService.loadRecentEvents", () => {
  it("returns persisted events for the learner in reverse-chronological order", async () => {
    const learnerId = `learner-${Date.now()}-events`;
    const service = createSrsService(prisma);
    const enroll = {
      kind: REF_VOCAB.kind as "vocabulary",
      itemId: REF_VOCAB.itemId,
      pt: REF_VOCAB.pt,
      gloss: REF_VOCAB.gloss,
      unitId: REF_VOCAB.unitId,
    };
    await service.recordRecall({
      learnerId,
      itemId: REF_VOCAB.itemId,
      kind: "vocabulary",
      grade: "easy",
      now: 1_700_000_000_000,
      enroll,
    });
    await service.recordRecall({
      learnerId,
      itemId: REF_VOCAB.itemId,
      kind: "vocabulary",
      grade: "hard",
      now: 1_700_000_001_000,
    });

    const events = await service.loadRecentEvents(learnerId, 10);
    expect(events).toHaveLength(2);
    expect(events[0]?.timestamp).toBeGreaterThanOrEqual(events[1]?.timestamp ?? 0);
    expect(events[0]?.grade).toBe("hard");
  });
});

describe("parseRecordRecallRequest", () => {
  it("rejects a missing JSON body", () => {
    const parsed = parseRecordRecallRequest(null);
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.code).toBe("MISSING_FIELDS");
  });

  it("rejects when learnerId / itemId / kind / grade are missing", () => {
    const parsed = parseRecordRecallRequest({});
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.code).toBe("MISSING_FIELDS");
  });

  it("rejects an invalid kind", () => {
    const parsed = parseRecordRecallRequest({
      learnerId: "l",
      itemId: "i",
      grade: "good",
      kind: "phrase",
    });
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.code).toBe("INVALID_KIND");
  });

  it("rejects an invalid grade", () => {
    const parsed = parseRecordRecallRequest({
      learnerId: "l",
      itemId: "i",
      grade: "perfect",
      kind: "vocabulary",
    });
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.code).toBe("INVALID_GRADE");
  });

  it("parses the typed enroll + refs + timestamp when all are present", () => {
    const parsed = parseRecordRecallRequest({
      learnerId: "l-1",
      itemId: "v-1",
      kind: "vocabulary",
      grade: "good",
      pt: "olá",
      gloss: "hello",
      unitId: "a0-1",
      timestamp: 1_700_000_000_000,
      refs: [REF_VOCAB],
    });
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.value.enroll).toEqual({
        kind: "vocabulary",
        itemId: "v-1",
        pt: "olá",
        gloss: "hello",
        unitId: "a0-1",
      });
      expect(parsed.value.refs).toEqual([REF_VOCAB]);
      expect(parsed.value.now).toBe(1_700_000_000_000);
    }
  });

  it("omits the enroll field when pt / gloss / unitId are absent", () => {
    const parsed = parseRecordRecallRequest({
      learnerId: "l-1",
      itemId: "v-1",
      kind: "vocabulary",
      grade: "good",
    });
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.value.enroll).toBeUndefined();
  });
});
