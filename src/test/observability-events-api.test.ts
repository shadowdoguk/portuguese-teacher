// Integration test for the observability events route (issue #36).
// POST /api/observability/events — persists voice_loop_latency events to
// the VoiceLoopLatencySample table. Non-latency events are accepted and
// acknowledged but not persisted (counted in `skipped`).

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { execSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import {
  POST as postEvents,
  type ObservabilityEventsResponse,
} from "@/app/api/observability/events/route";
import type { VoiceLoopLatencyEvent } from "@/lib/observability/sink";

let prisma: PrismaClient;
let tmpDir: string;
let dbPath: string;

beforeAll(async () => {
  tmpDir = mkdtempSync(join(tmpdir(), "pt-events-api-"));
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

function jsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/observability/events", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeLatencyEvent(
  overrides: Partial<VoiceLoopLatencyEvent> = {},
): VoiceLoopLatencyEvent {
  return {
    kind: "voice_loop_latency",
    occurredAt: 1_700_000_000_000,
    stage: "asr",
    latencyMs: 250,
    ok: true,
    ...overrides,
  };
}

describe("POST /api/observability/events", () => {
  it("returns 400 on invalid JSON", async () => {
    const res = await postEvents(
      new Request("http://localhost/api/observability/events", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "not json",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when the events array is missing", async () => {
    const res = await postEvents(jsonRequest({}));
    expect(res.status).toBe(400);
  });

  it("persists valid voice_loop_latency events and returns the counts", async () => {
    const res = await postEvents(
      jsonRequest({
        events: [
          makeLatencyEvent({ stage: "asr", latencyMs: 250 }),
          makeLatencyEvent({ stage: "llm", latencyMs: 380 }),
        ],
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as ObservabilityEventsResponse;
    expect(body).toEqual({ ok: true, received: 2, written: 2, skipped: 0 });
    expect(await prisma.voiceLoopLatencySample.count()).toBe(2);
  });

  it("skips non-latency events without erroring", async () => {
    const res = await postEvents(
      jsonRequest({
        events: [
          makeLatencyEvent(),
          {
            kind: "degradation",
            occurredAt: Date.now(),
            service: "asr",
            status: "degraded",
          },
          {
            kind: "srs_recall",
            occurredAt: Date.now(),
            learnerId: "l1",
            itemId: "v-1",
            grade: "good",
            halfLifeBeforeMs: 100,
            halfLifeAfterMs: 200,
            dueAt: Date.now(),
          },
        ],
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as ObservabilityEventsResponse;
    expect(body.received).toBe(3);
    expect(body.written).toBe(1);
    expect(body.skipped).toBe(2);
  });

  it("skips events with unknown stages", async () => {
    const res = await postEvents(
      jsonRequest({
        events: [
          makeLatencyEvent({ stage: "asr" }),
          // Intentional bad input — bypass the type-checked helper.
          {
            kind: "voice_loop_latency",
            occurredAt: 1_700_000_000_000,
            stage: "magic-stage",
            latencyMs: 100,
            ok: true,
          },
        ],
      }),
    );
    const body = (await res.json()) as ObservabilityEventsResponse;
    expect(body.written).toBe(1);
    expect(body.skipped).toBe(1);
  });

  it("skips events with invalid latencyMs", async () => {
    const res = await postEvents(
      jsonRequest({
        events: [
          makeLatencyEvent({ latencyMs: NaN }),
          makeLatencyEvent({ latencyMs: -50 }),
        ],
      }),
    );
    const body = (await res.json()) as ObservabilityEventsResponse;
    expect(body.received).toBe(2);
    expect(body.written).toBe(0);
    expect(body.skipped).toBe(2);
  });

  it("preserves learnerId / tier / practiceMode on persisted samples", async () => {
    const res = await postEvents(
      jsonRequest({
        events: [
          makeLatencyEvent({
            stage: "client.total",
            latencyMs: 1_750,
            learnerId: "learner-7",
            tier: 1,
            practiceMode: "drill",
          }),
        ],
      }),
    );
    expect(res.status).toBe(200);
    const row = await prisma.voiceLoopLatencySample.findFirst();
    expect(row).toMatchObject({
      stage: "client.total",
      latencyMs: 1_750,
      learnerId: "learner-7",
      tier: 1,
      practiceMode: "drill",
    });
  });

  it("returns 413 when the batch exceeds the cap", async () => {
    const events = Array.from({ length: 501 }, (_, i) =>
      makeLatencyEvent({ latencyMs: 100 + i }),
    );
    const res = await postEvents(jsonRequest({ events }));
    expect(res.status).toBe(413);
  });

  it("returns {written: 0} when the batch has only invalid events", async () => {
    const res = await postEvents(
      jsonRequest({
        events: [
          makeLatencyEvent({ latencyMs: NaN }),
          // Bypass type-checked helper to inject an unknown stage.
          {
            kind: "voice_loop_latency",
            occurredAt: 1_700_000_000_000,
            stage: "unknown",
            latencyMs: 100,
            ok: true,
          },
        ],
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as ObservabilityEventsResponse;
    expect(body.written).toBe(0);
    expect(body.skipped).toBe(2);
    expect(await prisma.voiceLoopLatencySample.count()).toBe(0);
  });
});