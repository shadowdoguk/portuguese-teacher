// GET /api/observability/sli
//
// Returns the per-stage Voice Loop latency SLIs (p50/p95/p99) over the
// requested rolling window, plus the p95 total-latency alert evaluation.
// Powers the /dashboards/voice-loop-latency surface (issue #36,
// ADR-0002 §"Latency budget").

import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import {
  createLatencyRepository,
  type LatencyRepository,
} from "@/lib/observability/repository";
import {
  DEFAULT_ALERT_WINDOW_MS,
  DEFAULT_LATENCY_THRESHOLD_MS,
  aggregateSli,
  evaluateLatencyAlert,
  LATENCY_WINDOWS,
  type LatencyAlert,
  type LatencySample,
  type LatencyWindowName,
  type SliSummary,
} from "@/lib/observability/sli";
import { LATENCY_STAGES, type LatencyStage } from "@/lib/observability/sink";

export const runtime = "nodejs";

let prismaSingleton: PrismaClient | null = null;
function prisma(): PrismaClient {
  if (!prismaSingleton) prismaSingleton = new PrismaClient();
  return prismaSingleton;
}

export type SliResponse = {
  ok: true;
  windowMs: number;
  windowName: LatencyWindowName;
  thresholdMs: number;
  alertWindowMs: number;
  summaries: ReadonlyArray<SliSummary>;
  alert: LatencyAlert;
  filters: {
    learnerId?: string;
    tier?: 1 | 2 | 3;
    practiceMode?: "free-form" | "scenario" | "drill";
  };
};

export type SliErrorResponse = { ok: false; error: string };

const VALID_WINDOWS = new Set<string>(Object.keys(LATENCY_WINDOWS));
const VALID_STAGES = new Set<string>(LATENCY_STAGES);

function parseTier(
  raw: string | null,
): { ok: true; value: 1 | 2 | 3 } | { ok: false } | { ok: true; value: undefined } {
  if (raw === null) return { ok: true, value: undefined };
  if (raw === "1" || raw === "2" || raw === "3") {
    return { ok: true, value: Number(raw) as 1 | 2 | 3 };
  }
  return { ok: false };
}

function parsePracticeMode(
  raw: string | null,
):
  | { ok: true; value: "free-form" | "scenario" | "drill" }
  | { ok: false }
  | { ok: true; value: undefined } {
  if (raw === null) return { ok: true, value: undefined };
  if (raw === "free-form" || raw === "scenario" || raw === "drill") {
    return { ok: true, value: raw };
  }
  return { ok: false };
}

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const windowNameRaw = url.searchParams.get("window") ?? "1h";
  if (!VALID_WINDOWS.has(windowNameRaw)) {
    return NextResponse.json(
      {
        ok: false,
        error: `Invalid window. Expected one of: ${Object.keys(LATENCY_WINDOWS).join(", ")}`,
      } satisfies SliErrorResponse,
      { status: 400 },
    );
  }
  const windowName = windowNameRaw as LatencyWindowName;
  const windowMs = LATENCY_WINDOWS[windowName];

  const learnerId = url.searchParams.get("learnerId")?.trim() || undefined;
  const tierResult = parseTier(url.searchParams.get("tier"));
  if (!tierResult.ok) {
    return NextResponse.json(
      { ok: false, error: "Invalid tier. Expected one of: 1, 2, 3." } satisfies SliErrorResponse,
      { status: 400 },
    );
  }
  const tier = tierResult.value;
  const practiceModeResult = parsePracticeMode(url.searchParams.get("practiceMode"));
  if (!practiceModeResult.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid practiceMode. Expected one of: free-form, scenario, drill.",
      } satisfies SliErrorResponse,
      { status: 400 },
    );
  }
  const practiceMode = practiceModeResult.value;

  const stagesParam = url.searchParams.get("stages");
  let stages: ReadonlyArray<LatencyStage> | undefined;
  if (stagesParam) {
    const requested = stagesParam.split(",").map((s) => s.trim()).filter(Boolean);
    const filtered = requested.filter((s) => VALID_STAGES.has(s)) as LatencyStage[];
    if (filtered.length === 0) {
      return NextResponse.json(
        { ok: false, error: "No valid stages in filter" } satisfies SliErrorResponse,
        { status: 400 },
      );
    }
    stages = filtered;
  }

  const thresholdParam = url.searchParams.get("thresholdMs");
  let thresholdMs = DEFAULT_LATENCY_THRESHOLD_MS;
  if (thresholdParam) {
    const parsed = Number.parseInt(thresholdParam, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return NextResponse.json(
        { ok: false, error: "Invalid thresholdMs" } satisfies SliErrorResponse,
        { status: 400 },
      );
    }
    thresholdMs = parsed;
  }

  const alertWindowParam = url.searchParams.get("alertWindowMs");
  let alertWindowMs = DEFAULT_ALERT_WINDOW_MS;
  if (alertWindowParam) {
    const parsed = Number.parseInt(alertWindowParam, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return NextResponse.json(
        { ok: false, error: "Invalid alertWindowMs" } satisfies SliErrorResponse,
        { status: 400 },
      );
    }
    alertWindowMs = parsed;
  }

  const now = Date.now();
  const since = now - windowMs;

  const repo: LatencyRepository = createLatencyRepository(prisma());
  const samples: ReadonlyArray<LatencySample> = await repo.loadSamples({
    since,
    ...(stages ? { stages } : {}),
    ...(learnerId ? { learnerId } : {}),
    ...(tier !== undefined ? { tier } : {}),
    ...(practiceMode ? { practiceMode } : {}),
  });

  const summaries = aggregateSli({
    samples,
    windowMs,
    now,
    ...(stages ? { stages } : {}),
    ...(learnerId ? { learnerId } : {}),
    ...(tier !== undefined ? { tier } : {}),
    ...(practiceMode ? { practiceMode } : {}),
  });

  // Alert is always evaluated over the alert window (independent of the
  // summary window) so the dashboard can show the latest 5-minute p95
  // regardless of whether the user is looking at the 1h or 7d window.
  const alertSamples = await repo.loadSamples({
    since: now - alertWindowMs,
    stages: ["client.total"],
    ...(learnerId ? { learnerId } : {}),
    ...(tier !== undefined ? { tier } : {}),
    ...(practiceMode ? { practiceMode } : {}),
  });
  const alert = evaluateLatencyAlert({
    samples: alertSamples,
    thresholdMs,
    windowMs: alertWindowMs,
    now,
  });

  const response: SliResponse = {
    ok: true,
    windowMs,
    windowName,
    thresholdMs,
    alertWindowMs,
    summaries,
    alert,
    filters: {
      ...(learnerId ? { learnerId } : {}),
      ...(tier !== undefined ? { tier } : {}),
      ...(practiceMode ? { practiceMode } : {}),
    },
  };
  return NextResponse.json(response);
}