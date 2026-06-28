import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { execSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { GET as getEvents } from "@/app/api/srs/events/route";
import { createSrsRepository } from "@/lib/srs";

let prisma: PrismaClient;
let tmpDir: string;

beforeAll(async () => {
  tmpDir = mkdtempSync(join(tmpdir(), "pt-srs-events-api-"));
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

describe("GET /api/srs/events", () => {
  it("returns 400 when learnerId is missing", async () => {
    const res = await getEvents(new Request("http://localhost/api/srs/events"));
    expect(res.status).toBe(400);
  });

  it("returns 400 when limit is non-positive", async () => {
    const res = await getEvents(
      new Request("http://localhost/api/srs/events?learnerId=l&limit=0"),
    );
    expect(res.status).toBe(400);
  });

  it("returns empty events + zero stats for an unknown learner", async () => {
    const res = await getEvents(
      new Request("http://localhost/api/srs/events?learnerId=ghost"),
    );
    const body = (await res.json()) as {
      ok: boolean;
      events: unknown[];
      stats: { total: number; todayCount: number; easyPercent: number };
    };
    expect(body.ok).toBe(true);
    expect(body.events).toEqual([]);
    expect(body.stats).toEqual({
      total: 0,
      todayCount: 0,
      easyPercent: 0,
      lastRecallAt: null,
    });
  });

  it("returns the persisted events and rolled-up stats", async () => {
    const learnerId = `learner-${Date.now()}-events`;
    const repo = createSrsRepository(prisma);

    const now = Date.now();
    const item = {
      itemId: `v-${learnerId}`,
      halfLifeMs: 600_000,
      lastReviewedAt: null,
      dueAt: now + 600_000,
      reviewCount: 0,
      lapses: 0,
    } as const;
    await repo.upsertRecords(learnerId, [item]);

    await repo.applyRecall({
      learnerId,
      itemId: item.itemId,
      kind: "vocabulary",
      grade: "easy",
      record: { ...item, reviewCount: 1, dueAt: now + 2_400_000 },
      event: {
        event: "srs_recall",
        learnerId,
        itemId: item.itemId,
        grade: "easy",
        halfLifeBeforeMs: 600_000,
        halfLifeAfterMs: 2_400_000,
        dueAt: now + 2_400_000,
        timestamp: now,
      },
    });

    const res = await getEvents(
      new Request(`http://localhost/api/srs/events?learnerId=${learnerId}`),
    );
    const body = (await res.json()) as {
      ok: boolean;
      events: Array<{ itemId: string; grade: string }>;
      stats: { total: number; todayCount: number; easyPercent: number };
    };
    expect(body.ok).toBe(true);
    expect(body.events).toHaveLength(1);
    expect(body.events[0]?.grade).toBe("easy");
    expect(body.stats.total).toBe(1);
    expect(body.stats.easyPercent).toBe(100);
    expect(body.stats.todayCount).toBe(1);
  });

  it("caps limit at 5000", async () => {
    const learnerId = `learner-${Date.now()}-cap`;
    const res = await getEvents(
      new Request(`http://localhost/api/srs/events?learnerId=${learnerId}&limit=10000`),
    );
    expect(res.status).toBe(200);
  });
});