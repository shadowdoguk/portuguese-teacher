// Integration test for the Voice Loop latency repository. Spins up a
// throwaway SQLite database via Prisma migrate deploy, exercises the full
// recordSamples → loadSamples → pruneOlderThan flow, and pins the
// loadSamples filter semantics. Issue #36 acceptance: "Each stage's
// latency is visible in the dashboard."

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { execSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { createLatencyRepository } from "@/lib/observability/repository";

let prisma: PrismaClient;
let tmpDir: string;
let dbPath: string;

beforeAll(async () => {
  tmpDir = mkdtempSync(join(tmpdir(), "pt-latency-repo-"));
  dbPath = join(tmpDir, "test.db");
  process.env.DATABASE_URL = `file:${dbPath}`;

  execSync("pnpm exec prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: `file:${dbPath}` },
    stdio: "pipe",
  });

  prisma = new PrismaClient({
    datasources: { db: { url: `file:${dbPath}` } },
  });
}, 60_000);

afterAll(async () => {
  await prisma?.$disconnect();
  if (tmpDir) rmSync(tmpDir, { recursive: true, force: true });
});

beforeEach(async () => {
  await prisma.voiceLoopLatencySample.deleteMany({});
});

describe("createLatencyRepository", () => {
  it("records samples and returns the count of rows written", async () => {
    const repo = createLatencyRepository(prisma);
    const { written } = await repo.recordSamples([
      {
        stage: "asr",
        latencyMs: 250,
        occurredAt: 1_700_000_000_000,
        ok: true,
      },
      {
        stage: "llm",
        latencyMs: 380,
        occurredAt: 1_700_000_001_000,
        ok: true,
        learnerId: "learner-1",
        tier: 1,
        practiceMode: "free-form",
      },
    ]);
    expect(written).toBe(2);
    expect(await repo.count()).toBe(2);
  });

  it("returns {written: 0} for an empty input (no Prisma call)", async () => {
    const repo = createLatencyRepository(prisma);
    const { written } = await repo.recordSamples([]);
    expect(written).toBe(0);
    expect(await repo.count()).toBe(0);
  });

  it("loadSamples returns recorded samples in occurredAt-desc order", async () => {
    const repo = createLatencyRepository(prisma);
    await repo.recordSamples([
      { stage: "asr", latencyMs: 100, occurredAt: 1_000, ok: true },
      { stage: "asr", latencyMs: 200, occurredAt: 3_000, ok: true },
      { stage: "asr", latencyMs: 300, occurredAt: 2_000, ok: true },
    ]);
    const samples = await repo.loadSamples({ since: 0 });
    expect(samples.map((s) => s.latencyMs)).toEqual([200, 300, 100]);
  });

  it("loadSamples honours the since boundary", async () => {
    const repo = createLatencyRepository(prisma);
    await repo.recordSamples([
      { stage: "asr", latencyMs: 100, occurredAt: 1_000, ok: true },
      { stage: "asr", latencyMs: 200, occurredAt: 3_000, ok: true },
    ]);
    const samples = await repo.loadSamples({ since: 2_000 });
    expect(samples).toHaveLength(1);
    expect(samples[0]?.latencyMs).toBe(200);
  });

  it("loadSamples filters by stage, learnerId, tier, and practiceMode", async () => {
    const repo = createLatencyRepository(prisma);
    await repo.recordSamples([
      { stage: "asr", latencyMs: 100, occurredAt: 1_000, ok: true, learnerId: "l1", tier: 1, practiceMode: "free-form" },
      { stage: "asr", latencyMs: 200, occurredAt: 1_000, ok: true, learnerId: "l1", tier: 2, practiceMode: "free-form" },
      { stage: "asr", latencyMs: 300, occurredAt: 1_000, ok: true, learnerId: "l2", tier: 1, practiceMode: "free-form" },
      { stage: "asr", latencyMs: 400, occurredAt: 1_000, ok: true, learnerId: "l1", tier: 1, practiceMode: "drill" },
      { stage: "llm", latencyMs: 500, occurredAt: 1_000, ok: true, learnerId: "l1", tier: 1, practiceMode: "free-form" },
    ]);
    const samples = await repo.loadSamples({
      since: 0,
      stages: ["asr"],
      learnerId: "l1",
      tier: 1,
      practiceMode: "free-form",
    });
    expect(samples).toHaveLength(1);
    expect(samples[0]?.latencyMs).toBe(100);
  });

  it("loadSamples preserves ok + tier + practiceMode in the returned shape", async () => {
    const repo = createLatencyRepository(prisma);
    await repo.recordSamples([
      {
        stage: "client.total",
        latencyMs: 1_500,
        occurredAt: 1_700_000_000_000,
        ok: false,
        learnerId: "learner-9",
        tier: 2,
        practiceMode: "scenario",
      },
    ]);
    const samples = await repo.loadSamples({ since: 0 });
    expect(samples).toHaveLength(1);
    expect(samples[0]).toEqual({
      stage: "client.total",
      latencyMs: 1_500,
      occurredAt: 1_700_000_000_000,
      ok: false,
      learnerId: "learner-9",
      tier: 2,
      practiceMode: "scenario",
    });
  });

  it("pruneOlderThan hard-deletes samples older than the cutoff", async () => {
    const repo = createLatencyRepository(prisma);
    await repo.recordSamples([
      { stage: "asr", latencyMs: 100, occurredAt: 1_000, ok: true },
      { stage: "asr", latencyMs: 200, occurredAt: 5_000, ok: true },
      { stage: "asr", latencyMs: 300, occurredAt: 9_000, ok: true },
    ]);
    const { deleted } = await repo.pruneOlderThan(5_000);
    expect(deleted).toBe(1);
    expect(await repo.count()).toBe(2);
    const remaining = await repo.loadSamples({ since: 0 });
    expect(remaining.map((s) => s.latencyMs).sort()).toEqual([200, 300]);
  });

  it("respects the limit cap", async () => {
    const repo = createLatencyRepository(prisma);
    const samples = Array.from({ length: 200 }, (_, i) => ({
      stage: "asr" as const,
      latencyMs: 100 + i,
      occurredAt: 1_000 + i,
      ok: true,
    }));
    await repo.recordSamples(samples);
    const loaded = await repo.loadSamples({ since: 0, limit: 50 });
    expect(loaded).toHaveLength(50);
  });
});