"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import type { LatencyStage } from "@/lib/observability/sink";
import type { LatencyAlert, SliSummary } from "@/lib/observability/sli";

export type SliApiResponse = {
  ok: true;
  windowMs: number;
  windowName: "1h" | "24h" | "7d";
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

export type SliApiError = { ok: false; error: string };

const STAGE_LABEL: Record<LatencyStage, string> = {
  asr: "ASR",
  llm: "LLM",
  tts: "TTS",
  rerank: "Re-rank",
  pronunciation: "Phoneme-distance",
  "client.eos": "End-of-speech",
  "client.upload": "Audio upload",
  "client.total": "Total turn",
};

const STAGE_BUDGET_MS: Partial<Record<LatencyStage, number>> = {
  asr: 300,
  llm: 400,
  tts: 200,
  pronunciation: 1500,
  rerank: 400,
  "client.eos": 600,
  "client.upload": 200,
  "client.total": 1500,
};

function formatMs(value: number | null): string {
  if (value === null) return "—";
  return `${Math.round(value)} ms`;
}

function pctOfBudget(value: number | null, budget: number | undefined): string {
  if (value === null || budget === undefined) return "—";
  return `${Math.round((value / budget) * 100)}% of budget`;
}

function formatWindowName(windowName: "1h" | "24h" | "7d"): string {
  if (windowName === "1h") return "Last hour";
  if (windowName === "24h") return "Last 24 h";
  return "Last 7 days";
}

export function VoiceLoopLatencyDashboard({
  initialWindow = "1h",
}: {
  initialWindow?: "1h" | "24h" | "7d";
}) {
  const [windowName, setWindowName] = useState<"1h" | "24h" | "7d">(initialWindow);
  const [data, setData] = useState<SliApiResponse | SliApiError | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    async function load(): Promise<void> {
      try {
        const res = await fetch(
          `/api/observability/sli?window=${encodeURIComponent(windowName)}`,
          { cache: "no-store" },
        );
        if (!res.ok) {
          // Try to surface the API's structured error message before falling
          // back to the status code. The route returns `{ ok: false, error }`
          // even on 4xx responses.
          let message = `SLI fetch failed (${res.status})`;
          try {
            const errBody = (await res.json()) as SliApiError;
            if (errBody && errBody.ok === false && typeof errBody.error === "string") {
              message = errBody.error;
            }
          } catch {
            /* keep the status-code fallback */
          }
          throw new Error(message);
        }
        const body = (await res.json()) as SliApiResponse | SliApiError;
        if (cancelled) return;
        setData(body);
      } catch (err) {
        if (cancelled) return;
        setData({
          ok: false,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [windowName]);

  return (
    <div className="space-y-6" data-testid="voice-loop-latency-dashboard">
      <header className="space-y-2">
        <p className="stage-stamp">Voice Loop SLI</p>
        <h1 className="font-display text-3xl text-ink">
          Per-stage latency dashboard
        </h1>
        <p className="max-w-prose text-sm text-ink-soft">
          Tracks each stage of the Conversational Practice pipeline against the
          ADR-0002 latency budget. The alert fires when p95 total turn latency
          exceeds {data && data.ok ? data.thresholdMs : 1500} ms for more than
          {" "}
          {data && data.ok
            ? Math.round(data.alertWindowMs / 60_000)
            : 5}{" "}
          minutes.
        </p>
      </header>

      <div className="flex items-center gap-2" role="group" aria-label="Time window">
        {(["1h", "24h", "7d"] as const).map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => setWindowName(name)}
            aria-pressed={windowName === name}
            className={
              windowName === name
                ? "rounded-full border border-ink bg-ink px-4 py-2 text-sm font-medium text-paper"
                : "rounded-full border border-ink/20 bg-paper px-4 py-2 text-sm text-ink hover:border-ink/40"
            }
            data-testid={`window-toggle-${name}`}
          >
            {formatWindowName(name)}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-ink-mute" data-testid="dashboard-loading">
          Loading latency samples…
        </p>
      ) : null}

      {!loading && data && !data.ok ? (
        <Card eyebrow="Error" title="Could not load SLIs">
          <p className="text-sm text-terracotta-deep" data-testid="dashboard-error">
            {data.error}
          </p>
        </Card>
      ) : null}

      {!loading && data && data.ok ? (
        <>
          <LatencyAlertBanner alert={data.alert} />

          <Card
            eyebrow="Per-stage SLI"
            title={`Latency over the ${formatWindowName(data.windowName).toLowerCase()}`}
            titleAs="h2"
          >
            <div
              className="overflow-x-auto"
              data-testid="sli-table"
              data-window={data.windowName}
            >
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink/10 text-left text-xs uppercase tracking-wide text-ink-mute">
                    <th className="py-2 pr-4">Stage</th>
                    <th className="py-2 pr-4">Samples</th>
                    <th className="py-2 pr-4">p50</th>
                    <th className="py-2 pr-4">p95</th>
                    <th className="py-2 pr-4">p99</th>
                    <th className="py-2 pr-4">Budget</th>
                  </tr>
                </thead>
                <tbody>
                  {data.summaries.map((summary) => {
                    const budget = STAGE_BUDGET_MS[summary.stage];
                    return (
                      <tr
                        key={summary.stage}
                        className="border-b border-ink/5 last:border-b-0"
                        data-testid="sli-row"
                        data-stage={summary.stage}
                      >
                        <td className="py-3 pr-4 font-medium text-ink">
                          {STAGE_LABEL[summary.stage]}
                        </td>
                        <td className="py-3 pr-4 text-ink-soft">
                          {summary.count}
                        </td>
                        <td className="py-3 pr-4 text-ink-soft">
                          {formatMs(summary.p50)}
                        </td>
                        <td className="py-3 pr-4 text-ink-soft">
                          {formatMs(summary.p95)}
                        </td>
                        <td className="py-3 pr-4 text-ink-soft">
                          {formatMs(summary.p99)}
                        </td>
                        <td className="py-3 pr-4 text-ink-mute">
                          {budget !== undefined
                            ? `${budget} ms (${pctOfBudget(summary.p95, budget)})`
                            : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {data.summaries.every((s) => s.count === 0) ? (
              <p
                className="mt-4 text-xs text-ink-mute"
                data-testid="sli-empty-state"
              >
                No latency samples yet. Once learners start exercising the
                Voice Loop, each stage&apos;s p50 / p95 / p99 will populate here.
              </p>
            ) : null}
          </Card>
        </>
      ) : null}
    </div>
  );
}

function LatencyAlertBanner({ alert }: { alert: LatencyAlert }) {
  if (!alert.breached) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="rounded-lg border border-ink/10 bg-paper-warm/40 p-4 text-sm text-ink-soft"
        data-testid="latency-alert-banner"
        data-status="ok"
      >
        <strong className="font-display text-ink">Budget healthy.</strong>{" "}
        p95 total turn latency {alert.currentP95 === null
          ? "has no samples in the alert window yet"
          : `is ${Math.round(alert.currentP95)} ms (under ${alert.thresholdMs} ms)`}
        {" "}— {alert.sampleCount} sample{alert.sampleCount === 1 ? "" : "s"} in
        the last {Math.round(alert.windowMs / 60_000)} min.
      </div>
    );
  }
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="rounded-lg border border-terracotta bg-paper-warm p-4 text-sm"
      data-testid="latency-alert-banner"
      data-status="breached"
    >
      <strong className="font-display text-terracotta-deep">
        Latency budget breach.
      </strong>{" "}
      p95 total turn latency is{" "}
      {alert.currentP95 === null ? "—" : `${Math.round(alert.currentP95)} ms`}
      {" "}— over the {alert.thresholdMs} ms budget for the last{" "}
      {Math.round(alert.windowMs / 60_000)} min. {alert.sampleCount} sample
      {alert.sampleCount === 1 ? "" : "s"} in window.
    </div>
  );
}