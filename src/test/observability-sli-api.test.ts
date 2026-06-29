// Integration test for the SLI query route (issue #36).
// GET /api/observability/sli — returns per-stage p50/p95/p99 over the
// requested window plus the p95 total-latency alert evaluation.

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { execSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { createLatencyRepository } from "@/lib/observability/repository";
import { GET as getSli, type SliResponse } from "@/app/api/observability/sli/route";

let prisma: PrismaClient;
let tmpDir: string;
let dbPath: string;

beforeAll(async () => {
  tmpDir = mkdtempSync(join(tmpdir(), "pt-sli-api-"));
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

function request(url: string): Request {
  return new Request(url, { method: "GET" });
}

async function seedLatencySamples(): Promise<void> {
  const repo = createLatencyRepository(prisma);
  const now = Date.now();
  await repo.recordSamples([
    // 20 ASR samples @ 250 ms
    ...Array.from({ length: 20 }, (_, i) => ({
      stage: "asr" as const,
      latencyMs: 250,
      occurredAt: now - i * 60_000,
      ok: true,
    })),
    // 20 LLM samples @ 380 ms
    ...Array.from({ length: 20 }, (_, i) => ({
      stage: "llm" as const,
      latencyMs: 380,
      occurredAt: now - i * 60_000,
      ok: true,
    })),
    // 10 client.total samples @ 1450 ms (healthy)
    ...Array.from({ length: 10 }, (_, i) => ({
      stage: "client.total" as const,
      latencyMs: 1_450,
      occurredAt: now - i * 30_000,
      ok: true,
    })),
  ]);
}

describe("GET /api/observability/sli", () => {
  it("returns 400 for an invalid window", async () => {
    const res = await getSli(request("http://localhost/api/observability/sli?window=2h"));
    expect(res.status).toBe(400);
  });

  it("returns 400 for an invalid tier", async () => {
    const res = await getSli(request("http://localhost/api/observability/sli?tier=9"));
    expect(res.status).toBe(400);
  });

  it("returns 400 when no valid stages are in the filter", async () => {
    const res = await getSli(
      request("http://localhost/api/observability/sli?stages=banana"),
    );
    expect(res.status).toBe(400);
  });

  it("returns per-stage SLIs + alert for the 1h window (default)", async () => {
    await seedLatencySamples();
    const res = await getSli(request("http://localhost/api/observability/sli"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as SliResponse;
    expect(body.ok).toBe(true);
    expect(body.windowName).toBe("1h");
    expect(body.thresholdMs).toBe(1500);
    expect(body.alertWindowMs).toBe(300_000);

    const asr = body.summaries.find((s) => s.stage === "asr")!;
    expect(asr.count).toBe(20);
    expect(asr.p50).toBe(250);
    expect(asr.p95).toBe(250);
    expect(asr.p99).toBe(250);

    const llm = body.summaries.find((s) => s.stage === "llm")!;
    expect(llm.count).toBe(20);
    expect(llm.p50).toBe(380);

    const total = body.summaries.find((s) => s.stage === "client.total")!;
    expect(total.count).toBe(10);
    expect(total.p50).toBe(1_450);

    // All samples are healthy (1_450 < 1_500 budget) so the alert is OK.
    expect(body.alert.breached).toBe(false);
    expect(body.alert.currentP95).toBe(1_450);
    expect(body.alert.sampleCount).toBe(10);
  });

  it("reports a breach when client.total p95 is over 1500 ms", async () => {
    const repo = createLatencyRepository(prisma);
    const now = Date.now();
    // 4 samples @ 1500 (healthy) + 1 sample @ 3000 (breach) → p95 = 3000.
    await repo.recordSamples(
      Array.from({ length: 5 }, (_, i) => ({
        stage: "client.total" as const,
        latencyMs: i === 0 ? 3_000 : 1_500,
        occurredAt: now - i * 30_000,
        ok: true,
      })),
    );
    const res = await getSli(request("http://localhost/api/observability/sli"));
    const body = (await res.json()) as SliResponse;
    expect(body.alert.breached).toBe(true);
    expect(body.alert.currentP95).toBeGreaterThan(1500);
  });

  it("filters by learnerId when supplied", async () => {
    const repo = createLatencyRepository(prisma);
    const now = Date.now();
    await repo.recordSamples([
      { stage: "asr", latencyMs: 200, occurredAt: now, ok: true, learnerId: "l1" },
      { stage: "asr", latencyMs: 500, occurredAt: now, ok: true, learnerId: "l2" },
    ]);
    const res = await getSli(
      request("http://localhost/api/observability/sli?learnerId=l1"),
    );
    const body = (await res.json()) as SliResponse;
    const asr = body.summaries.find((s) => s.stage === "asr")!;
    expect(asr.count).toBe(1);
    expect(asr.p50).toBe(200);
    expect(body.filters.learnerId).toBe("l1");
  });

  it("filters by tier + practiceMode when supplied", async () => {
    const repo = createLatencyRepository(prisma);
    const now = Date.now();
    await repo.recordSamples([
      { stage: "asr", latencyMs: 100, occurredAt: now, ok: true, tier: 1, practiceMode: "free-form" },
      { stage: "asr", latencyMs: 300, occurredAt: now, ok: true, tier: 2, practiceMode: "drill" },
    ]);
    const res = await getSli(
      request("http://localhost/api/observability/sli?tier=1&practiceMode=free-form"),
    );
    const body = (await res.json()) as SliResponse;
    const asr = body.summaries.find((s) => s.stage === "asr")!;
    expect(asr.count).toBe(1);
    expect(asr.p50).toBe(100);
    expect(body.filters.tier).toBe(1);
    expect(body.filters.practiceMode).toBe("free-form");
  });

  it("filters by stages when supplied (single stage report)", async () => {
    await seedLatencySamples();
    const res = await getSli(
      request("http://localhost/api/observability/sli?stages=asr"),
    );
    const body = (await res.json()) as SliResponse;
    expect(body.summaries).toHaveLength(1);
    expect(body.summaries[0]?.stage).toBe("asr");
  });

  it("returns the empty-state shape (no samples) when the table is empty", async () => {
    const res = await getSli(request("http://localhost/api/observability/sli"));
    const body = (await res.json()) as SliResponse;
    for (const summary of body.summaries) {
      expect(summary.count).toBe(0);
      expect(summary.p50).toBeNull();
      expect(summary.p95).toBeNull();
      expect(summary.p99).toBeNull();
    }
    expect(body.alert.breached).toBe(false);
    expect(body.alert.sampleCount).toBe(0);
  });

  it("accepts a custom thresholdMs + alertWindowMs", async () => {
    const repo = createLatencyRepository(prisma);
    const now = Date.now();
    // Spread samples across 60 s so they're comfortably inside the 120 s
    // alert window even though the route's `Date.now()` runs a few ms
    // after this loop. (Issue #36.)
    await repo.recordSamples(
      Array.from({ length: 5 }, (_, i) => ({
        stage: "client.total" as const,
        latencyMs: 2_500,
        occurredAt: now - i * 15_000,
        ok: true,
      })),
    );
    const res = await getSli(
      request(
        "http://localhost/api/observability/sli?thresholdMs=2000&alertWindowMs=120000",
      ),
    );
    const body = (await res.json()) as SliResponse;
    expect(body.thresholdMs).toBe(2_000);
    expect(body.alertWindowMs).toBe(120_000);
    expect(body.alert.breached).toBe(true);
    expect(body.alert.sampleCount).toBe(5);
  });
});