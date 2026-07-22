"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import {
  aggregateRecallStats,
  formatRecallStats,
  type RecallStats,
} from "@/lib/observability/aggregate";
import type { SrsRecallEvent } from "@/lib/srs/types";

const ZERO_STATS: RecallStats = {
  total: 0,
  todayCount: 0,
  easyPercent: 0,
  lastRecallAt: null,
};

type Status = "loading" | "ready" | "empty" | "error";

type FetchedStats = {
  status: Status;
  stats: RecallStats;
  error: string | null;
};

function buildEmptyState(): FetchedStats {
  return { status: "empty", stats: { ...ZERO_STATS }, error: null };
}

export function RecallStatsTile({ learnerId }: { learnerId: string }) {
  const [data, setData] = useState<FetchedStats>({
    status: "loading",
    stats: { ...ZERO_STATS },
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      try {
        const res = await fetch(
          `/api/srs/events?learnerId=${encodeURIComponent(learnerId)}&limit=500`,
        );
        if (!res.ok) {
          throw new Error(`Failed to load recall stats (${res.status})`);
        }
        const body = (await res.json()) as {
          ok: boolean;
          error?: string;
          events: ReadonlyArray<SrsRecallEvent>;
          stats: RecallStats;
        };
        if (!body.ok) {
          throw new Error(body.error ?? "Recall stats response was not ok");
        }
        if (cancelled) return;
        const events = body.events;
        const stats = events.length === 0
          ? aggregateRecallStats(events, Date.now())
          : body.stats;
        if (events.length === 0) {
          setData(buildEmptyState());
        } else {
          setData({ status: "ready", stats, error: null });
        }
      } catch (err) {
        if (cancelled) return;
        setData({
          status: "error",
          stats: { ...ZERO_STATS },
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [learnerId]);

  const headline =
    data.status === "loading"
      ? "Loading your recall history…"
      : data.status === "error"
        ? "Recall history unavailable"
        : formatRecallStats(data.stats);

  const detail = (() => {
    if (data.status === "loading") {
      return "Pulling the last 500 reviews from the analytics pipeline.";
    }
    if (data.status === "error") {
      return data.error ?? "Unknown error";
    }
    if (data.status === "empty") {
      return "Grade your first review on /review to see your recall stats populate here.";
    }
    const { total, lastRecallAt } = data.stats;
    const last = lastRecallAt
      ? new Date(lastRecallAt).toLocaleString()
      : "—";
    return `${total} recall${total === 1 ? "" : "s"} total · last graded ${last}`;
  })();

  return (
    <Card eyebrow="Recall telemetry" title="Spaced repetition">
      <p
        className="text-sm text-ink-soft"
        data-testid="recall-stats-headline"
        data-status={data.status}
      >
        {headline}
      </p>
      <p className="mt-2 text-xs text-ink-mute" data-testid="recall-stats-detail">
        {detail}
      </p>
      {data.status === "ready" ? (
        <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
          <div className="rounded-lg border border-ink/10 bg-paper-warm/40 p-3">
            <dt className="stage-stamp">Today</dt>
            <dd
              className="mt-1 font-display text-2xl text-ink"
              data-testid="recall-stats-today"
            >
              {data.stats.todayCount}
            </dd>
          </div>
          <div className="rounded-lg border border-ink/10 bg-paper-warm/40 p-3">
            <dt className="stage-stamp">Easy %</dt>
            <dd
              className="mt-1 font-display text-2xl text-ink"
              data-testid="recall-stats-easy-percent"
            >
              {data.stats.easyPercent}
            </dd>
          </div>
          <div className="rounded-lg border border-ink/10 bg-paper-warm/40 p-3">
            <dt className="stage-stamp">Total</dt>
            <dd
              className="mt-1 font-display text-2xl text-ink"
              data-testid="recall-stats-total"
            >
              {data.stats.total}
            </dd>
          </div>
        </dl>
      ) : null}
      {data.status === "error" ? (
        <p className="mt-3 text-xs text-terracotta-deep" data-testid="recall-stats-error">
          {data.error}
        </p>
      ) : null}
    </Card>
  );
}