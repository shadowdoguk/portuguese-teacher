// POST /api/observability/events
//
// Persists a batch of `voice_loop_latency` events emitted by `withLatencyMetric`
// (server-side, miniMax wrappers) and the client-side Voice Loop turn tracker.
// Latency events drive the per-stage SLI dashboards + p95 alert
// (issue #36, ADR-0002 §"Latency budget"). Non-latency events are accepted and
// acknowledged but not persisted in this slice — they remain console-only.

import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import {
  createLatencyRepository,
  type LatencyRepository,
} from "@/lib/observability/repository";
import { LATENCY_STAGES, type VoiceLoopLatencyEvent } from "@/lib/observability/sink";
import type { LatencySample } from "@/lib/observability/sli";

export const runtime = "nodejs";

let prismaSingleton: PrismaClient | null = null;
function prisma(): PrismaClient {
  if (!prismaSingleton) prismaSingleton = new PrismaClient();
  return prismaSingleton;
}

export type ObservabilityEventsRequest = {
  events: ReadonlyArray<VoiceLoopLatencyEvent>;
};

export type ObservabilityEventsResponse = {
  ok: true;
  received: number;
  written: number;
  skipped: number;
};

export type ObservabilityEventsErrorResponse = {
  ok: false;
  error: string;
};

const MAX_BATCH = 500;

export async function POST(request: Request): Promise<NextResponse> {
  let body: ObservabilityEventsRequest;
  try {
    body = (await request.json()) as ObservabilityEventsRequest;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" } satisfies ObservabilityEventsErrorResponse,
      { status: 400 },
    );
  }
  if (!Array.isArray(body.events)) {
    return NextResponse.json(
      { ok: false, error: "Missing events array" } satisfies ObservabilityEventsErrorResponse,
      { status: 400 },
    );
  }
  if (body.events.length > MAX_BATCH) {
    return NextResponse.json(
      { ok: false, error: `Batch too large (max ${MAX_BATCH})` } satisfies ObservabilityEventsErrorResponse,
      { status: 413 },
    );
  }

  const validStages = new Set<string>(LATENCY_STAGES);
  const samples: LatencySample[] = [];
  let skipped = 0;
  for (const event of body.events) {
    if (event.kind !== "voice_loop_latency") {
      skipped += 1;
      continue;
    }
    if (typeof event.stage !== "string" || !validStages.has(event.stage)) {
      skipped += 1;
      continue;
    }
    if (
      typeof event.latencyMs !== "number" ||
      !Number.isFinite(event.latencyMs) ||
      event.latencyMs < 0
    ) {
      skipped += 1;
      continue;
    }
    if (typeof event.occurredAt !== "number" || !Number.isFinite(event.occurredAt)) {
      skipped += 1;
      continue;
    }
    samples.push({
      stage: event.stage,
      latencyMs: Math.round(event.latencyMs),
      occurredAt: event.occurredAt,
      ok: event.ok ?? true,
      ...(typeof event.learnerId === "string" ? { learnerId: event.learnerId } : {}),
      ...(event.tier !== undefined ? { tier: event.tier } : {}),
      ...(event.practiceMode !== undefined ? { practiceMode: event.practiceMode } : {}),
    });
  }

  if (samples.length === 0) {
    return NextResponse.json({
      ok: true,
      received: body.events.length,
      written: 0,
      skipped,
    } satisfies ObservabilityEventsResponse);
  }

  const repo: LatencyRepository = createLatencyRepository(prisma());
  const { written } = await repo.recordSamples(samples);
  return NextResponse.json({
    ok: true,
    received: body.events.length,
    written,
    skipped,
  } satisfies ObservabilityEventsResponse);
}