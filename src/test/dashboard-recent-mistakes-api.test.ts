import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { execSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { GET as getRecentMistakes } from "@/app/api/dashboard/recent-mistakes/route";
import { createSrsRepository } from "@/lib/srs";

let prisma: PrismaClient;
let tmpDir: string;

beforeAll(async () => {
  tmpDir = mkdtempSync(join(tmpdir(), "pt-recent-mistakes-api-"));
  const dbPath = join(tmpDir, "test.db");
  process.env.DATABASE_URL = `file:${dbPath}`;
  execSync(`pnpm exec prisma migrate deploy`, {
    env: { ...process.env, DATABASE_URL: `file:${dbPath}` },
    stdio: "pipe",
  });
  prisma = new PrismaClient({ datasources: { db: { url: `file:${dbPath}` } } });

  await prisma.curriculum.upsert({
    where: { id: "pt-PT-v1" },
    update: {},
    create: {
      id: "pt-PT-v1",
      dialect: "pt-PT",
      entryUnitId: "u-test",
    },
  });
  await prisma.level.upsert({
    where: { id: "A0" },
    update: {},
    create: {
      id: "A0",
      curriculumId: "pt-PT-v1",
      order: 0,
      label: "A0",
    },
  });
  await prisma.unit.create({
    data: {
      id: "u-test",
      curriculumId: "pt-PT-v1",
      levelId: "A0",
      order: 1,
      title: "Test",
      description: "Test",
    },
  });
  await prisma.vocabularyItem.create({
    data: {
      id: "v-cafe",
      unitId: "u-test",
      pt: "café",
      gloss: "coffee",
    },
  });
  await prisma.vocabularyItem.create({
    data: {
      id: "v-obrigado",
      unitId: "u-test",
      pt: "obrigado",
      gloss: "thank you",
    },
  });
}, 60000);

afterAll(async () => {
  await prisma?.$disconnect();
  if (tmpDir) rmSync(tmpDir, { recursive: true, force: true });
});

describe("GET /api/dashboard/recent-mistakes", () => {
  it("returns 400 when learnerId is missing", async () => {
    const res = await getRecentMistakes(
      new Request("http://localhost/api/dashboard/recent-mistakes"),
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { ok: boolean };
    expect(body.ok).toBe(false);
  });

  it("returns the empty result for an unknown learner", async () => {
    const res = await getRecentMistakes(
      new Request(
        "http://localhost/api/dashboard/recent-mistakes?learnerId=ghost",
      ),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      ok: boolean;
      learnerId: string;
      windowDays: number;
      limit: number;
      result: {
        items: unknown[];
        totalLapses: number;
        uniqueItems: number;
      };
    };
    expect(body.ok).toBe(true);
    expect(body.learnerId).toBe("ghost");
    expect(body.windowDays).toBe(7);
    expect(body.limit).toBe(5);
    expect(body.result.items).toEqual([]);
    expect(body.result.totalLapses).toBe(0);
    expect(body.result.uniqueItems).toBe(0);
  });

  it("returns the persisted recent mistakes with vocabulary lookup", async () => {
    const learnerId = `learner-${Date.now()}-recent`;
    const repo = createSrsRepository(prisma);

    const now = Date.now();
    const baseRecord = {
      halfLifeMs: 600_000,
      lastReviewedAt: null,
      dueAt: now,
      reviewCount: 1,
      lapses: 1,
    } as const;

    await repo.applyRecall({
      learnerId,
      itemId: "v-cafe",
      kind: "vocabulary",
      grade: "again",
      record: { ...baseRecord, itemId: "v-cafe" },
      event: {
        event: "srs_recall",
        learnerId,
        itemId: "v-cafe",
        grade: "again",
        halfLifeBeforeMs: 600_000,
        halfLifeAfterMs: 150_000,
        dueAt: now,
        timestamp: now - 1 * 24 * 60 * 60 * 1000,
      },
    });
    await repo.applyRecall({
      learnerId,
      itemId: "v-cafe",
      kind: "vocabulary",
      grade: "again",
      record: { ...baseRecord, itemId: "v-cafe", lapses: 2 },
      event: {
        event: "srs_recall",
        learnerId,
        itemId: "v-cafe",
        grade: "again",
        halfLifeBeforeMs: 600_000,
        halfLifeAfterMs: 150_000,
        dueAt: now,
        timestamp: now - 2 * 24 * 60 * 60 * 1000,
      },
    });
    await repo.applyRecall({
      learnerId,
      itemId: "v-obrigado",
      kind: "vocabulary",
      grade: "good",
      record: { ...baseRecord, itemId: "v-obrigado" },
      event: {
        event: "srs_recall",
        learnerId,
        itemId: "v-obrigado",
        grade: "good",
        halfLifeBeforeMs: 600_000,
        halfLifeAfterMs: 1_500_000,
        dueAt: now,
        timestamp: now - 1 * 24 * 60 * 60 * 1000,
      },
    });

    const res = await getRecentMistakes(
      new Request(
        `http://localhost/api/dashboard/recent-mistakes?learnerId=${learnerId}`,
      ),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      ok: boolean;
      result: {
        items: Array<{
          itemId: string;
          kind: string;
          pt: string;
          gloss: string;
          lapses: number;
          lastLapseAt: number;
        }>;
        totalLapses: number;
        uniqueItems: number;
      };
    };
    expect(body.ok).toBe(true);
    expect(body.result.totalLapses).toBe(2);
    expect(body.result.uniqueItems).toBe(1);
    expect(body.result.items).toHaveLength(1);
    expect(body.result.items[0]?.itemId).toBe("v-cafe");
    expect(body.result.items[0]?.kind).toBe("vocabulary");
    expect(body.result.items[0]?.pt).toBe("café");
    expect(body.result.items[0]?.gloss).toBe("coffee");
    expect(body.result.items[0]?.lapses).toBe(2);
  });

  it("honours the windowDays override", async () => {
    const learnerId = `learner-${Date.now()}-window`;
    const repo = createSrsRepository(prisma);
    const now = Date.now();

    await repo.applyRecall({
      learnerId,
      itemId: "v-cafe",
      kind: "vocabulary",
      grade: "again",
      record: {
        itemId: "v-cafe",
        halfLifeMs: 600_000,
        lastReviewedAt: null,
        dueAt: now,
        reviewCount: 1,
        lapses: 1,
      },
      event: {
        event: "srs_recall",
        learnerId,
        itemId: "v-cafe",
        grade: "again",
        halfLifeBeforeMs: 600_000,
        halfLifeAfterMs: 150_000,
        dueAt: now,
        timestamp: now - 5 * 24 * 60 * 60 * 1000,
      },
    });

    const res = await getRecentMistakes(
      new Request(
        `http://localhost/api/dashboard/recent-mistakes?learnerId=${learnerId}&windowDays=3`,
      ),
    );
    const body = (await res.json()) as {
      result: { items: unknown[]; windowMs: number };
    };
    expect(body.result.items).toEqual([]);
    expect(body.result.windowMs).toBe(3 * 24 * 60 * 60 * 1000);
  });
});